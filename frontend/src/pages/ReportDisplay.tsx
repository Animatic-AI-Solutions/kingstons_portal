import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { calculateStandardizedMultipleFundsIRR, getLatestFundIRRs } from '../services/api';
import { createIRRDataService } from '../services/irrDataService';
import historicalIRRService from '../services/historicalIRRService';
import BaseInput from '../components/ui/BaseInput';
import { ArrowLeftIcon, PrinterIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useReactToPrint } from 'react-to-print';
import { formatDateFallback, formatCurrencyFallback, formatPercentageFallback } from '../components/reports/shared/ReportFormatters';
import api from '../services/api';

// Interfaces for data types (copied from ReportGenerator)
interface ProductPeriodSummary {
  id: number;
  product_name: string;
  product_type?: string;
  product_owner_name?: string;
  start_date: string | null;
  total_investment: number;
  total_regular_investment: number;
  total_government_uplift: number;
  total_product_switch_in: number;
  total_product_switch_out: number;
  total_fund_switch_in: number;
  total_fund_switch_out: number;
  total_withdrawal: number;
  total_switch_in: number; // Keep for backward compatibility
  total_switch_out: number; // Keep for backward compatibility
  net_flow: number;
  current_valuation: number;
  irr: number | null;
  provider_name?: string;
  provider_theme_color?: string;
  funds?: FundSummary[];
  weighted_risk?: number;
  status?: string;
  plan_number?: string;
}

interface FundSummary {
  id: number;
  available_funds_id: number;
  fund_name: string;
  total_investment: number;
  total_regular_investment: number;
  total_government_uplift: number;
  total_product_switch_in: number;
  total_product_switch_out: number;
  total_fund_switch_in: number;
  total_fund_switch_out: number;
  total_withdrawal: number;
  total_switch_in: number; // Keep for backward compatibility
  total_switch_out: number; // Keep for backward compatibility
  net_flow: number;
  current_valuation: number;
  irr: number | null;
  isin_number?: string;
  status: string;
  isVirtual?: boolean;
  inactiveFundCount?: number;
  risk_factor?: number;
  inactiveFunds?: FundSummary[];
  historical_irr?: number[];
  historical_dates?: string[];
}

interface ReportData {
  productSummaries: ProductPeriodSummary[];
  totalIRR: number | null;
  totalValuation: number | null;
  earliestTransactionDate: string | null;
  selectedValuationDate: string | null;
  productOwnerNames: string[];
  timePeriod: string;
  // Report settings
  truncateAmounts?: boolean;
  roundIrrToOne?: boolean;
  formatWithdrawalsAsNegative?: boolean;
  showInactiveProducts: boolean;
  showPreviousFunds: boolean;
  showInactiveProductDetails?: number[]; // Array of product IDs that should show detailed cards
}

const ReportDisplay: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  
  // Create IRR data service instance
  const irrDataService = useMemo(() => createIRRDataService(api), []);
  const [activeTab, setActiveTab] = useState<'summary' | 'irr-history'>('summary');
  const [irrHistoryData, setIrrHistoryData] = useState<any>(null);
  const [loadingIrrHistory, setLoadingIrrHistory] = useState(false);

  const [showInactiveProductDetails, setShowInactiveProductDetails] = useState<Set<number>>(new Set());
  
  // Real-time total IRR calculation
  const [realTimeTotalIRR, setRealTimeTotalIRR] = useState<number | null>(null);
  const [loadingTotalIRR, setLoadingTotalIRR] = useState(false);
  
  // Portfolio IRR values from database
  const [portfolioIrrValues, setPortfolioIrrValues] = useState<Map<number, number>>(new Map());
  
  // Toggle for hiding zero values
  const [hideZeros, setHideZeros] = useState(false);
  
  // Toggle for visual signing system
  const [visualSigning, setVisualSigning] = useState(false);

  // Custom title management state
  const [customTitles, setCustomTitles] = useState<Map<number, string>>(new Map());
  
  // Modal-based title editing state
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [modalTitles, setModalTitles] = useState<Map<number, string>>(new Map());
  const [modalHasChanges, setModalHasChanges] = useState(false);

  // Create ref for the printable content
  const printRef = useRef<HTMLDivElement>(null);

  // Function to organize products by type in the specified order
  const organizeProductsByType = (products: ProductPeriodSummary[]) => {
    const productTypeOrder = [
      'ISAs',
      'GIAs', 
      'Onshore Bonds',
      'Offshore Bonds',
      'Pensions',
      'Other'
    ];

    // Normalize product type for consistent comparison
    const normalizeProductType = (type: string | undefined): string => {
      if (!type) return 'Other';
      
      const normalized = type.toLowerCase().trim();
      
      // ISA variations
      if (normalized.includes('isa')) return 'ISAs';
      
      // GIA variations
      if (normalized.includes('gia') || normalized === 'general investment account') return 'GIAs';
      
      // Bond variations
      if (normalized.includes('onshore') && normalized.includes('bond')) return 'Onshore Bonds';
      if (normalized.includes('offshore') && normalized.includes('bond')) return 'Offshore Bonds';
      if (normalized.includes('bond') && !normalized.includes('onshore') && !normalized.includes('offshore')) {
        return 'Onshore Bonds'; // Default bonds to onshore
      }
      
      // Pension variations
      if (normalized.includes('pension') || normalized.includes('sipp') || normalized.includes('ssas')) return 'Pensions';
      
      return 'Other';
    };

    // Group products by normalized type
    const groupedProducts: { [key: string]: ProductPeriodSummary[] } = {};
    
    products.forEach(product => {
      const normalizedType = normalizeProductType(product.product_type);
      if (!groupedProducts[normalizedType]) {
        groupedProducts[normalizedType] = [];
      }
      groupedProducts[normalizedType].push(product);
    });

    // Sort products within each type by provider name, with special ordering for ISAs
    Object.keys(groupedProducts).forEach(type => {
      if (type === 'ISAs') {
        // Special sorting for ISAs: ISA products first, then JISA products, then by provider
        groupedProducts[type].sort((a, b) => {
          const typeA = a.product_type?.toLowerCase().trim() || '';
          const typeB = b.product_type?.toLowerCase().trim() || '';
          
          // Check if products are JISA
          const isJISA_A = typeA === 'jisa';
          const isJISA_B = typeB === 'jisa';
          
          // If one is JISA and the other is not, non-JISA comes first
          if (isJISA_A && !isJISA_B) return 1;
          if (!isJISA_A && isJISA_B) return -1;
          
          // If both are same type (both JISA or both ISA), sort by provider
          const providerA = a.provider_name || '';
          const providerB = b.provider_name || '';
          return providerA.localeCompare(providerB);
        });
      } else {
        // Standard sorting by provider name for other product types
        groupedProducts[type].sort((a, b) => {
          const providerA = a.provider_name || '';
          const providerB = b.provider_name || '';
          return providerA.localeCompare(providerB);
        });
      }
    });

    // Return products in the specified order
    const orderedProducts: ProductPeriodSummary[] = [];
    
    productTypeOrder.forEach(type => {
      if (groupedProducts[type]) {
        orderedProducts.push(...groupedProducts[type]);
      }
    });

    return orderedProducts;
  };

  // Function to organize products by type with grouped structure for headers
  const organizeProductsByTypeWithHeaders = (products: ProductPeriodSummary[]) => {
    const productTypeOrder = [
      'ISAs',
      'GIAs', 
      'Onshore Bonds',
      'Offshore Bonds',
      'Pensions',
      'Other'
    ];

    // Normalize product type for consistent comparison
    const normalizeProductType = (type: string | undefined): string => {
      if (!type) return 'Other';
      
      const normalized = type.toLowerCase().trim();
      
      // ISA variations
      if (normalized.includes('isa')) return 'ISAs';
      
      // GIA variations
      if (normalized.includes('gia') || normalized === 'general investment account') return 'GIAs';
      
      // Bond variations
      if (normalized.includes('onshore') && normalized.includes('bond')) return 'Onshore Bonds';
      if (normalized.includes('offshore') && normalized.includes('bond')) return 'Offshore Bonds';
      if (normalized.includes('bond') && !normalized.includes('onshore') && !normalized.includes('offshore')) {
        return 'Onshore Bonds'; // Default bonds to onshore
      }
      
      // Pension variations
      if (normalized.includes('pension') || normalized.includes('sipp') || normalized.includes('ssas')) return 'Pensions';
      
      return 'Other';
    };

    // Group products by normalized type
    const groupedProducts: { [key: string]: ProductPeriodSummary[] } = {};
    
    products.forEach(product => {
      const normalizedType = normalizeProductType(product.product_type);
      if (!groupedProducts[normalizedType]) {
        groupedProducts[normalizedType] = [];
      }
      groupedProducts[normalizedType].push(product);
    });

    // Sort products within each type by provider name, with special ordering for ISAs
    Object.keys(groupedProducts).forEach(type => {
      if (type === 'ISAs') {
        // Special sorting for ISAs: ISA products first, then JISA products, then by provider
        groupedProducts[type].sort((a, b) => {
          const typeA = a.product_type?.toLowerCase().trim() || '';
          const typeB = b.product_type?.toLowerCase().trim() || '';
          
          // Check if products are JISA
          const isJISA_A = typeA === 'jisa';
          const isJISA_B = typeB === 'jisa';
          
          // If one is JISA and the other is not, non-JISA comes first
          if (isJISA_A && !isJISA_B) return 1;
          if (!isJISA_A && isJISA_B) return -1;
          
          // If both are same type (both JISA or both ISA), sort by provider
          const providerA = a.provider_name || '';
          const providerB = b.provider_name || '';
          return providerA.localeCompare(providerB);
        });
      } else {
        // Standard sorting by provider name for other product types
        groupedProducts[type].sort((a, b) => {
          const providerA = a.provider_name || '';
          const providerB = b.provider_name || '';
          return providerA.localeCompare(providerB);
        });
      }
    });

    // Return grouped structure with headers
    const groupedResult: Array<{ type: string; products: ProductPeriodSummary[] }> = [];
    
    productTypeOrder.forEach(type => {
      if (groupedProducts[type] && groupedProducts[type].length > 0) {
        groupedResult.push({
          type,
          products: groupedProducts[type]
        });
      }
    });

    return groupedResult;
  };

  // Add CSS for product fund table column alignment
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Product Fund Tables - Fixed column widths for vertical alignment on screen */
      .product-fund-table {
        table-layout: fixed !important;
        width: 100% !important;
      }
      
      .product-fund-table th:nth-child(1),
      .product-fund-table td:nth-child(1) {
        width: 20% !important; /* Fund Name */
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
      }
      
      .product-fund-table th:nth-child(2),
      .product-fund-table td:nth-child(2) {
        width: 8% !important; /* Investment */
      }
      
      .product-fund-table th:nth-child(3),
      .product-fund-table td:nth-child(3) {
        width: 8% !important; /* Gov. Uplift */
      }
      
      .product-fund-table th:nth-child(4),
      .product-fund-table td:nth-child(4) {
        width: 8% !important; /* Prod. Switch In */
      }
      
      .product-fund-table th:nth-child(5),
      .product-fund-table td:nth-child(5) {
        width: 8% !important; /* Fund Switches */
      }
      
      .product-fund-table th:nth-child(6),
      .product-fund-table td:nth-child(6) {
        width: 8% !important; /* Prod. Switch Out */
      }
      
      .product-fund-table th:nth-child(7),
      .product-fund-table td:nth-child(7) {
        width: 8% !important; /* Withdrawal */
      }
      
      .product-fund-table th:nth-child(8),
      .product-fund-table td:nth-child(8) {
        width: 10% !important; /* Valuation */
      }
      
      .product-fund-table th:nth-child(9),
      .product-fund-table td:nth-child(9) {
        width: 10% !important; /* Profit Made */
      }
      
      .product-fund-table th:nth-child(10),
      .product-fund-table td:nth-child(10) {
        width: 8% !important; /* Return p.a. */
      }
      
      .product-fund-table th:nth-child(11),
      .product-fund-table td:nth-child(11) {
        width: 6% !important; /* Risk */
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // React-to-print implementation with landscape orientation - MUST be before any conditional returns
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Report_${reportData?.timePeriod.replace(/\s+/g, '_') || 'Export'}.pdf`,
    onBeforePrint: async () => {
      // Ensure IRR history is loaded before printing
      if (!irrHistoryData) {
        await fetchIrrHistory();
      }
    },
    pageStyle: `
      @media print {
        @page {
          margin: 0.2in 0.05in;
          size: A4 landscape;
        }
        
        /* Hide interactive elements */
        .print-hide {
          display: none !important;
        }
        
        /* Force page break before IRR History */
        .irr-history-section {
          page-break-before: always;
          break-before: page;
        }
        
        /* Prevent page breaks inside product cards */
        .product-card {
          page-break-inside: avoid;
          break-inside: avoid;
          margin-bottom: 1rem;
        }
        
        /* Prevent table breaks */
        .product-table {
          page-break-inside: avoid;
          break-inside: avoid;
          overflow: visible !important;
        }
        
        /* Clean up styling for print */
        .print-clean {
          box-shadow: none !important;
        }
        
        /* Preserve provider theme color borders in print */
        .print-clean[style*="border"] {
          /* Don't override inline border styles that contain provider colors */
        }
        
        /* Default border for elements without provider theme colors */
        .print-clean:not([style*="border"]) {
          border: 1px solid #e5e7eb !important;
        }
        
        /* Optimize for landscape layout */
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        /* Make tables more compact for landscape */
        .landscape-table {
          font-size: 11px;
          width: 100% !important;
          table-layout: fixed;
        }
        
        .landscape-table th,
        .landscape-table td {
          padding: 1px 4px;
          font-size: 10px;
          line-height: 1.0;
          word-wrap: break-word;
          overflow-wrap: break-word;
          vertical-align: middle;
        }
        
        /* Portfolio Summary specific optimizations */
        .portfolio-summary-table {
          font-size: 13px !important;
        }
        
        .portfolio-summary-table th,
        .portfolio-summary-table td {
          padding: 2px 3px !important;
          font-size: 12px !important;
          line-height: 1.2 !important;
          vertical-align: middle !important;
        }
        
        /* Allow header text to wrap, but keep data cells nowrap */
        .portfolio-summary-table th {
          white-space: normal !important;
          word-wrap: break-word !important;
          text-align: center !important;
          height: auto !important;
          min-height: 32px !important;
        }
        
        .portfolio-summary-table td {
          white-space: nowrap !important;
        }
        
        /* Make first column (Product) wider, others narrower */
        .portfolio-summary-table th:first-child,
        .portfolio-summary-table td:first-child {
          width: 25% !important;
          white-space: normal !important;
          word-wrap: break-word !important;
          text-align: left !important;
        }
        
        .portfolio-summary-table th:not(:first-child),
        .portfolio-summary-table td:not(:first-child) {
          width: 7.5% !important;
        }
        
        /* Product Fund Tables - Fixed column widths for vertical alignment */
        .product-card .landscape-table:not(.portfolio-summary-table) {
          table-layout: fixed !important;
          width: 100% !important;
          font-size: 11px !important;
        }
        
        .product-card .landscape-table:not(.portfolio-summary-table) th,
        .product-card .landscape-table:not(.portfolio-summary-table) td {
          font-size: 10px !important;
          line-height: 1.0 !important;
          padding: 1px 4px !important;
          vertical-align: middle !important;
        }
        
        .product-card .landscape-table:not(.portfolio-summary-table) th:nth-child(1),
        .product-card .landscape-table:not(.portfolio-summary-table) td:nth-child(1) {
          width: 20% !important; /* Fund Name */
        }
        
        .product-card .landscape-table:not(.portfolio-summary-table) th:nth-child(2),
        .product-card .landscape-table:not(.portfolio-summary-table) td:nth-child(2) {
          width: 8% !important; /* Investment */
        }
        
        .product-card .landscape-table:not(.portfolio-summary-table) th:nth-child(3),
        .product-card .landscape-table:not(.portfolio-summary-table) td:nth-child(3) {
          width: 8% !important; /* Gov. Uplift */
        }
        
        .product-card .landscape-table:not(.portfolio-summary-table) th:nth-child(4),
        .product-card .landscape-table:not(.portfolio-summary-table) td:nth-child(4) {
          width: 8% !important; /* Prod. Switch In */
        }
        
        .product-card .landscape-table:not(.portfolio-summary-table) th:nth-child(5),
        .product-card .landscape-table:not(.portfolio-summary-table) td:nth-child(5) {
          width: 8% !important; /* Fund Switches */
        }
        
        .product-card .landscape-table:not(.portfolio-summary-table) th:nth-child(6),
        .product-card .landscape-table:not(.portfolio-summary-table) td:nth-child(6) {
          width: 8% !important; /* Prod. Switch Out */
        }
        
        .product-card .landscape-table:not(.portfolio-summary-table) th:nth-child(7),
        .product-card .landscape-table:not(.portfolio-summary-table) td:nth-child(7) {
          width: 8% !important; /* Withdrawal */
        }
        
        .product-card .landscape-table:not(.portfolio-summary-table) th:nth-child(8),
        .product-card .landscape-table:not(.portfolio-summary-table) td:nth-child(8) {
          width: 10% !important; /* Valuation */
        }
        
        .product-card .landscape-table:not(.portfolio-summary-table) th:nth-child(9),
        .product-card .landscape-table:not(.portfolio-summary-table) td:nth-child(9) {
          width: 10% !important; /* Profit Made */
        }
        
        .product-card .landscape-table:not(.portfolio-summary-table) th:nth-child(10),
        .product-card .landscape-table:not(.portfolio-summary-table) td:nth-child(10) {
          width: 8% !important; /* Return p.a. */
        }
        
        .product-card .landscape-table:not(.portfolio-summary-table) th:nth-child(11),
        .product-card .landscape-table:not(.portfolio-summary-table) td:nth-child(11) {
          width: 6% !important; /* Risk */
        }
        
        /* Ensure Portfolio Performance cards stay side by side in print */
        .portfolio-performance-grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr 1fr !important;
          gap: 1rem !important;
        }
        
        .portfolio-performance-card {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          padding: 0.5rem !important;
        }
        
        /* Make Portfolio Performance section more compact */
        .portfolio-performance-grid {
          margin-bottom: 1rem !important;
        }
        
        .portfolio-performance-card .text-sm {
          font-size: 0.75rem !important;
        }
        
        .portfolio-performance-card .text-2xl {
          font-size: 1.25rem !important;
        }
        
        /* Remove gap completely between ALL titles and tables */
        h1, h2, h3, h4, h5, h6 {
          margin-bottom: 0 !important;
          margin-top: 0 !important;
        }
        
        /* Product card spacing */
        .product-card {
          margin-bottom: 1rem !important;
        }
        
        /* Force all product titles to have no margin */
        .product-card h3,
        .product-card .text-xl,
        .product-card .font-semibold {
          margin-bottom: 0 !important;
          margin-top: 0 !important;
        }
        
        /* Remove gaps for all table containers */
        .product-table,
        .overflow-x-auto,
        .overflow-x-auto table,
        table {
          margin-top: 0 !important;
          margin-bottom: 0 !important;
        }
        
        /* IRR History section - more specific targeting */
        .irr-history-section h2,
        .irr-history-section .text-2xl,
        .irr-history-section .font-bold {
          margin-bottom: 0 !important;
          margin-top: 0 !important;
        }
        
        .irr-history-section .product-card h3,
        .irr-history-section .product-card .text-xl,
        .irr-history-section .product-card .font-semibold {
          margin-bottom: 0 !important;
          margin-top: 0 !important;
        }
        
        /* Force gap removal on div containers */
        .mb-4, .mb-6, .mb-8 {
          margin-bottom: 0.5rem !important;
        }
        
        /* Specific targeting for headings in cards */
        .bg-white h2,
        .bg-white h3,
        .shadow-sm h2,
        .shadow-sm h3 {
          margin-bottom: 0 !important;
        }
        
        /* Reduce section spacing - make everything more compact */
        .product-card.print-clean {
          margin-bottom: 0.5rem !important;
          padding: 0.75rem !important;
        }
        
        /* Reduce spacing between main sections */
        .mb-8.product-card {
          margin-bottom: 0.5rem !important;
        }
        
        /* Compact the main report content container */
        .w-full.mx-auto.px-4 {
          padding-top: 1rem !important;
          padding-bottom: 1rem !important;
        }
        
        /* Reduce spacing in IRR History section */
        .irr-history-section .product-card {
          margin-bottom: 0.5rem !important;
          padding: 0.75rem !important;
        }
        
        /* Make Portfolio Performance section more compact */
        .portfolio-performance-grid {
          margin-bottom: 0.5rem !important;
        }
        
        /* Remove card borders and shadows - but preserve provider theme color borders */
        .product-card.print-clean:not([style*="border"]),
        .bg-white.shadow-sm:not([style*="border"]),
        .border.border-gray-200:not([style*="border"]),
        .shadow-sm.rounded-lg:not([style*="border"]) {
          border: none !important;
          box-shadow: none !important;
          background: white !important;
        }
        
        /* Preserve provider theme color borders and ensure colors are printed */
        .product-card.print-clean[style*="border"] {
          box-shadow: none !important;
          background: white !important;
          /* Keep the inline border styles intact */
        }
        
        /* Right-align most number columns in print, but center colored columns */
        .landscape-table th:not(:first-child):not(.bg-green-100):not(.bg-blue-100):not(.bg-purple-100),
        .landscape-table td:not(:first-child):not(.bg-green-50):not(.bg-blue-50):not(.bg-purple-50):not(.bg-green-100):not(.bg-blue-100):not(.bg-purple-100) {
          text-align: right !important;
        }
        
        /* Center colored columns in print */
        .landscape-table th.bg-green-100,
        .landscape-table th.bg-blue-100, 
        .landscape-table th.bg-purple-100,
        .landscape-table td.bg-green-50,
        .landscape-table td.bg-blue-50,
        .landscape-table td.bg-purple-50,
        .landscape-table td.bg-green-100,
        .landscape-table td.bg-blue-100,
        .landscape-table td.bg-purple-100 {
          text-align: center !important;
        }
        
        /* Keep Fund Name column left-aligned */
        .landscape-table th:first-child,
        .landscape-table td:first-child {
          text-align: left !important;
        }
      }
    `
  });

  const fetchPortfolioIrrValues = async () => {
    if (!reportData) return;
    
    try {
      console.log('🔍 [PORTFOLIO IRR] Fetching portfolio IRR values from database...');
      
      const productIds = reportData.productSummaries.map(product => product.id);
      console.log('🔍 [PORTFOLIO IRR] Product IDs:', productIds);
      
      // Fetch latest portfolio IRR values for each product
      const irrPromises = productIds.map(async (productId) => {
        try {
          // First, get the portfolio_id for this product from client_products
          console.log(`🔗 [PORTFOLIO IRR] Getting portfolio ID for product ${productId}...`);
          const clientProductResponse = await api.get(`/client_products/${productId}`);
          
          if (!clientProductResponse.data) {
            console.warn(`⚠️ [PORTFOLIO IRR] No client product found for product ${productId}`);
            return { productId, irr: null };
          }
          
          // Get the portfolio_id from the client product
          const portfolioId = clientProductResponse.data.portfolio_id;
          if (!portfolioId) {
            console.warn(`⚠️ [PORTFOLIO IRR] No portfolio_id found for product ${productId}`);
            return { productId, irr: null };
          }
          
          console.log(`🔗 [PORTFOLIO IRR] Product ${productId} maps to portfolio ${portfolioId}`);
          
          // Now fetch the latest IRR for this portfolio
          const response = await api.get(`/portfolios/${portfolioId}/latest_irr`);
          const irrValue = response.data?.irr_result || response.data?.irr_value || null;
          
          console.log(`✅ [PORTFOLIO IRR] Product ${productId} (portfolio ${portfolioId}) IRR:`, irrValue);
          return { productId, irr: irrValue };
        } catch (error) {
          console.warn(`⚠️ [PORTFOLIO IRR] Failed to fetch IRR for product ${productId}:`, error);
          return { productId, irr: null };
        }
      });
      
      const irrResults = await Promise.all(irrPromises);
      
      // Create a map of product_id to IRR value
      const irrMap = new Map();
      irrResults.forEach(({ productId, irr }) => {
        if (irr !== null) {
          irrMap.set(productId, irr);
        }
      });
      
      console.log('✅ [PORTFOLIO IRR] Final IRR values map:', Object.fromEntries(irrMap));
      setPortfolioIrrValues(irrMap);
      
    } catch (error) {
      console.error('❌ [PORTFOLIO IRR] Error fetching portfolio IRR values:', error);
    }
  };

  const fetchIrrHistory = async () => {
    if (!reportData || loadingIrrHistory) return;
    
    setLoadingIrrHistory(true);
    try {
      const productIds = reportData.productSummaries.map(p => p.id);
      const historyPromises = productIds.map(async (productId) => {
        const response = await fetch(`/api/historical-irr/combined/${productId}?limit=24`);
        if (!response.ok) throw new Error(`Failed to fetch IRR history for product ${productId}`);
        return await response.json();
      });
      
      const historyResults = await Promise.all(historyPromises);
      setIrrHistoryData(historyResults);
    } catch (error) {
      console.error('Error fetching IRR history:', error);
    } finally {
      setLoadingIrrHistory(false);
    }
  };

  const calculateRealTimeTotalIRR = async () => {
    if (!reportData || loadingTotalIRR) return;
    
    setLoadingTotalIRR(true);
    try {
      console.log('🎯 [REAL-TIME TOTAL IRR] Calculating aggregated IRR using multiple portfolio funds...');
      
      // Collect all portfolio fund IDs from all products
      const allPortfolioFundIds: number[] = [];
      
      reportData.productSummaries.forEach(product => {
        if (product.funds) {
          product.funds.forEach(fund => {
            if (!fund.isVirtual && fund.id) {
              allPortfolioFundIds.push(fund.id);
            }
          });
        }
      });

      console.log('🔗 [REAL-TIME TOTAL IRR] Collected portfolio fund IDs:', allPortfolioFundIds);
      
      if (allPortfolioFundIds.length === 0) {
        console.warn('⚠️ [REAL-TIME TOTAL IRR] No portfolio fund IDs found');
        setRealTimeTotalIRR(null);
        return;
      }

      // Convert partial date (YYYY-MM) to full date (YYYY-MM-DD) by using last day of month
      let irrDate = reportData.selectedValuationDate;
      if (irrDate && irrDate.length === 7) { // Format: YYYY-MM
        const [year, month] = irrDate.split('-');
        const lastDayOfMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
        irrDate = `${year}-${month}-${lastDayOfMonth.toString().padStart(2, '0')}`;
      }

      console.log(`🎯 [REAL-TIME TOTAL IRR] Using IRR date: ${irrDate}`);

      // Call the multiple portfolio funds IRR endpoint
      const response = await api.post('/portfolio_funds/multiple/irr', {
        portfolio_fund_ids: allPortfolioFundIds,
        irr_date: irrDate
      });

      console.log('🔍 [REAL-TIME TOTAL IRR] API Response:', response.data);

      if (response.data && response.data.irr_percentage !== null && response.data.irr_percentage !== undefined) {
        const aggregatedIrr = response.data.irr_percentage;
        setRealTimeTotalIRR(aggregatedIrr);
        console.log(`✅ [REAL-TIME TOTAL IRR] Calculated aggregated IRR: ${aggregatedIrr.toFixed(2)}% from ${allPortfolioFundIds.length} portfolio funds`);
        console.log(`📊 [REAL-TIME TOTAL IRR] Total valuation: £${response.data.total_valuation?.toLocaleString()}, Cash flows: ${response.data.cash_flows_count}`);
      } else {
        console.warn('⚠️ [REAL-TIME TOTAL IRR] No valid aggregated IRR returned from API');
        console.warn('🔍 [REAL-TIME TOTAL IRR] Response data structure:', response.data);
        console.warn('🔍 [REAL-TIME TOTAL IRR] irr_percentage value:', response.data?.irr_percentage);
        setRealTimeTotalIRR(null);
      }
    } catch (error) {
      console.error('❌ [REAL-TIME TOTAL IRR] Error calculating aggregated IRR:', error);
      setRealTimeTotalIRR(null);
    } finally {
      setLoadingTotalIRR(false);
    }
  };

  const handleTabChange = (tab: 'summary' | 'irr-history') => {
    setActiveTab(tab);
    // IRR history is now fetched automatically on page load, no need for conditional fetching
  };

  useEffect(() => {
    // Get report data from navigation state
    if (location.state && location.state.reportData) {
      console.log('🔍 [REPORT DISPLAY DEBUG] Received report data with', location.state.reportData.productSummaries.length, 'products');
      
      setReportData(location.state.reportData);
      
      // Initialize inactive product details from report data
      if (location.state.reportData.showInactiveProductDetails) {
        setShowInactiveProductDetails(new Set(location.state.reportData.showInactiveProductDetails));
      }
    } else {
      // If no report data, redirect back to report generator
      navigate('/report-generator');
    }
  }, [location.state, navigate]);

  // Calculate real-time total IRR and fetch IRR history when report data is loaded
  useEffect(() => {
    if (reportData) {
      fetchPortfolioIrrValues(); // Fetch portfolio IRR values from database
      fetchIrrHistory(); // Automatically fetch IRR history on page load
      calculateRealTimeTotalIRR(); // Calculate aggregated IRR using multiple portfolio funds
    }
  }, [reportData]);

  if (!reportData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  // Formatting functions based on report settings
  const formatCurrencyWithTruncation = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '£0';
    
    // Always round to nearest whole number
    const roundedAmount = Math.round(amount);
    
    // Handle negative values to display as -£XXXX
    if (roundedAmount < 0) {
      return `-£${Math.abs(roundedAmount).toLocaleString()}`;
    }
    
    return `£${roundedAmount.toLocaleString()}`;
  };

  const formatCurrencyWithZeroToggle = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return hideZeros ? '-' : '£0';
    
    const roundedAmount = Math.round(amount);
    if (hideZeros && roundedAmount === 0) return '-';
    
    // Handle negative values to display as -£XXXX
    if (roundedAmount < 0) {
      return `-£${Math.abs(roundedAmount).toLocaleString()}`;
    }
    
    return `£${roundedAmount.toLocaleString()}`;
  };

  const formatIrrWithPrecision = (irr: number | null | undefined): string => {
    if (irr === null || irr === undefined) return '-';
    
    // Always round to 1 decimal place
      return `${irr.toFixed(1)}%`;
  };

  const formatWithdrawalAmount = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '-';
    if (amount === 0) return formatCurrencyWithTruncation(amount);
    const displayAmount = reportData.formatWithdrawalsAsNegative ? -Math.abs(amount) : amount;
    return formatCurrencyWithTruncation(displayAmount);
  };

  const formatRiskFallback = (risk: number | undefined): string => {
    if (risk === undefined) return '-';
    
    // Always round to 1 decimal place
    return risk.toFixed(1);
  };

  // Individual fund risk formatting - whole numbers only (1-7)
  const formatFundRisk = (risk: number | undefined): string => {
    if (risk === undefined || risk === null) return '-';
    
    // Round to whole number (no decimal places)
    return Math.round(risk).toString();
  };

  // Product and portfolio risk formatting - 1 decimal place
  const formatWeightedRisk = (risk: number | undefined): string => {
    if (risk === undefined || risk === null) return '-';
    // Round to 1 decimal place for product/portfolio weighted risk
    return risk.toFixed(1);
  };

  // Visual signing helper functions
  const isOutflowActivity = (activityType: 'investment' | 'government_uplift' | 'product_switch_in' | 'product_switch_out' | 'withdrawal' | 'fund_switch'): boolean => {
    return activityType === 'withdrawal' || activityType === 'product_switch_out';
  };

  const isInflowActivity = (activityType: 'investment' | 'government_uplift' | 'product_switch_in' | 'product_switch_out' | 'withdrawal' | 'fund_switch'): boolean => {
    return activityType === 'investment' || activityType === 'government_uplift' || activityType === 'product_switch_in';
  };

  const formatCurrencyWithVisualSigning = (
    amount: number | null | undefined, 
    activityType: 'investment' | 'government_uplift' | 'product_switch_in' | 'product_switch_out' | 'withdrawal' | 'fund_switch'
  ): { value: string; className: string } => {
    if (!visualSigning) {
      // In normal view, show outflows as negative values
      if (amount === null || amount === undefined) {
      return {
          value: hideZeros ? '-' : '£0',
          className: ''
        };
      }

      const roundedAmount = Math.round(amount);
      if (hideZeros && roundedAmount === 0) {
        return {
          value: '-',
          className: ''
        };
      }

      // For outflows (withdrawals, product switch out, fund switch out) - show as negative
      if (isOutflowActivity(activityType) || (activityType === 'fund_switch' && roundedAmount < 0)) {
        return {
          value: `-£${Math.abs(roundedAmount).toLocaleString()}`,
          className: ''
        };
      }

      // For all other values, show as positive
      return {
        value: `£${Math.abs(roundedAmount).toLocaleString()}`,
        className: ''
      };
    }

    if (amount === null || amount === undefined) {
      return {
        value: hideZeros ? '-' : '£0',
        className: ''
      };
    }

    const roundedAmount = Math.round(amount);
    if (hideZeros && roundedAmount === 0) {
      return {
        value: '-',
        className: ''
      };
    }

    // If amount is zero, always show black (no color)
    if (roundedAmount === 0) {
      return {
        value: '£0',
        className: ''
      };
    }

    // Special handling for fund switches - show net gain/loss
    if (activityType === 'fund_switch') {
      const isLoss = roundedAmount < 0;
      return {
        value: isLoss ? `-£${Math.abs(roundedAmount).toLocaleString()}` : `£${roundedAmount.toLocaleString()}`,
        className: isLoss ? 'text-red-600' : 'text-green-600'
      };
    }

    // For outflows (withdrawals, product switch out) - show as red negative
    if (isOutflowActivity(activityType)) {
      return {
        value: `-£${Math.abs(roundedAmount).toLocaleString()}`,
        className: 'text-red-600'
      };
    }

    // For inflows (investments, gov uplift, product switch in) - show as green positive
    if (isInflowActivity(activityType)) {
      return {
        value: `£${Math.abs(roundedAmount).toLocaleString()}`,
        className: 'text-green-600'
      };
    }

    // Default case
    return {
      value: `£${Math.abs(roundedAmount).toLocaleString()}`,
      className: ''
    };
  };

  const toggleInactiveProductDetails = (productId: number) => {
    setShowInactiveProductDetails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleBackToGenerator = () => {
    navigate('/report-generator');
  };

  // Title generation and management functions
  const extractPlanNumber = (product: ProductPeriodSummary): string | null => {
    // First, check if plan_number field exists
    if (product.plan_number) {
      return product.plan_number;
    }
    
    // Fallback: try to extract from product_name if it contains plan-like patterns
    if (product.product_name) {
      const planMatch = product.product_name.match(/plan[:\s]+([A-Z0-9\-]+)/i);
      if (planMatch) {
        return planMatch[1];
      }
    }
    
    return null;
  };

  const generateProductTitle = (product: ProductPeriodSummary, customTitle?: string): string => {
    // If custom title exists, use it
    if (customTitle) return customTitle;
    
    // 1. Handle Bond naming - check if product_type contains "bond"
    let productType = product.product_type;
    if (productType?.toLowerCase().includes('bond')) {
      productType = 'Bond';
    }
    
    // 2. Handle multiple product owners
    let ownerDisplay = '';
    if (product.product_owner_name) {
      // Check if the product_owner_name contains multiple names (comma-separated or other delimiters)
      const ownerNames = product.product_owner_name.split(/[,&]/).map(name => name.trim());
      if (ownerNames.length > 1) {
        ownerDisplay = 'Joint';
      } else {
        ownerDisplay = product.product_owner_name;
      }
    }
    
    // 3. Add plan number if available
    let planNumberSuffix = '';
    const planNumber = extractPlanNumber(product);
    if (planNumber) {
      planNumberSuffix = ` - ${planNumber}`;
    }
    
    // 4. Construct final title
    const parts = [productType, product.provider_name, ownerDisplay].filter(Boolean);
    return parts.join(' - ') + planNumberSuffix;
  };

  // Modal management functions
  const openTitleModal = () => {
    // Initialize modal with current titles
    const initialModalTitles = new Map<number, string>();
    if (reportData?.productSummaries) {
      reportData.productSummaries.forEach(product => {
        const currentTitle = generateProductTitle(product, customTitles.get(product.id));
        initialModalTitles.set(product.id, customTitles.get(product.id) || currentTitle);
      });
    }
    setModalTitles(initialModalTitles);
    setModalHasChanges(false);
    setShowTitleModal(true);
  };

  const closeTitleModal = () => {
    setShowTitleModal(false);
    setModalTitles(new Map());
    setModalHasChanges(false);
  };

  const handleModalSave = () => {
    // Update customTitles with modalTitles, but only store non-default titles
    const newCustomTitles = new Map<number, string>();
    modalTitles.forEach((title, productId) => {
      const product = reportData?.productSummaries.find(p => p.id === productId);
      if (product) {
        const defaultTitle = generateProductTitle(product);
        // Only store if different from default
        if (title !== defaultTitle) {
          newCustomTitles.set(productId, title);
        }
      }
    });
    setCustomTitles(newCustomTitles);
    closeTitleModal();
  };

  const handleModalReset = () => {
    // Reset all titles to default in modal
    const resetModalTitles = new Map<number, string>();
    if (reportData?.productSummaries) {
      reportData.productSummaries.forEach(product => {
        const defaultTitle = generateProductTitle(product);
        resetModalTitles.set(product.id, defaultTitle);
      });
    }
    setModalTitles(resetModalTitles);
    setModalHasChanges(true);
  };

  const handleModalTitleChange = (productId: number, newTitle: string) => {
    const newModalTitles = new Map(modalTitles);
    newModalTitles.set(productId, newTitle);
    setModalTitles(newModalTitles);
    setModalHasChanges(true);
  };

  const resetAllTitles = () => {
    setCustomTitles(new Map());
  };



  // Product Title Modal Component
  const ProductTitleModal: React.FC = () => {
    if (!showTitleModal || !reportData?.productSummaries) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        closeTitleModal();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeTitleModal();
      } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleModalSave();
      }
    };

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 print-hide"
        onClick={handleOverlayClick}
        onKeyDown={handleKeyDown}
      >
        <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[80vh] flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Edit Product Titles</h2>
              <p className="text-sm text-gray-600 mt-1">
                Customize how product names appear in your report
              </p>
            </div>
            <button
              onClick={closeTitleModal}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Formatting Rules Preview */}
            <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Automatic Formatting Rules</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-blue-700">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>Bond products → "Bond"</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Multiple owners → "Joint"</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  <span>Plan numbers → appended</span>
                </div>
              </div>
            </div>

            {/* Product Title List */}
            <div className="space-y-4">
              {organizeProductsByType(reportData.productSummaries).map(product => {
                const defaultTitle = generateProductTitle(product);
                const currentModalTitle = modalTitles.get(product.id) || defaultTitle;
                const isCustom = currentModalTitle !== defaultTitle;
                
                return (
                  <div key={product.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      {/* Provider Color Indicator */}
                      {product.provider_theme_color && (
                        <div 
                          className="w-4 h-4 rounded-full mt-2 flex-shrink-0" 
                          style={{ backgroundColor: product.provider_theme_color }}
                        />
                      )}
                      
                      <div className="flex-1 min-w-0 space-y-3">
                        {/* Product Identifier */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-base font-medium text-gray-700">
                            {product.provider_name}
                          </span>
                          {product.status === 'inactive' && (
                            <span className="text-xs text-red-600 font-medium">(Inactive)</span>
                          )}
                          {isCustom && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              Custom
                            </span>
                          )}
                        </div>
                        
                        {/* Default Title Preview */}
                        <div className="text-sm text-gray-500 mb-3">
                          <span className="font-medium">Default:</span> {defaultTitle}
                        </div>
                        
                        {/* Title Input */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 max-w-4xl">
                            <BaseInput
                              value={currentModalTitle}
                              onChange={(e) => handleModalTitleChange(product.id, e.target.value)}
                              placeholder="Enter custom title..."
                              maxLength={100}
                              size="lg"
                              fullWidth={true}
                            />
                          </div>
                          <button
                            onClick={() => {
                              handleModalTitleChange(product.id, defaultTitle);
                            }}
                            className="px-3 py-3 text-sm text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded flex-shrink-0"
                            title="Reset to default"
                          >
                            ↺
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleModalReset}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Reset All to Default
            </button>
            
            <div className="flex items-center gap-3">
              <button
                onClick={closeTitleModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleModalSave}
                disabled={!modalHasChanges}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  modalHasChanges 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with navigation and actions */}
      <div className="bg-white shadow-sm border-b border-gray-200 print-hide">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={handleBackToGenerator}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Report Generator
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setVisualSigning(!visualSigning)}
                className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                  visualSigning 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {visualSigning ? (
                  <EyeSlashIcon className="h-4 w-4 mr-2" />
                ) : (
                  <EyeIcon className="h-4 w-4 mr-2" />
                )}
                <span className="text-sm font-medium">
                  {visualSigning ? 'Normal View' : 'Visual Signing'}
                </span>
              </button>
              <button
                onClick={() => setHideZeros(!hideZeros)}
                className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                  hideZeros 
                    ? 'bg-orange-600 text-white hover:bg-orange-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <span className="text-sm font-medium">
                  {hideZeros ? 'Show Zeros' : 'Hide Zeros'}
                </span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div ref={printRef} className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Report Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Report Summary
          </h1>
          <div className="text-lg text-gray-700 mb-1">
            {reportData.timePeriod}
          </div>
          {reportData.productOwnerNames.length > 0 && (
            <div className="text-md text-gray-600">
              {reportData.productOwnerNames.join(', ')}
            </div>
          )}
        </div>

        {/* Edit Titles Button */}
        <div className="mb-6 print-hide">
          <div className="flex justify-center">
            <button
              onClick={openTitleModal}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Product Titles
              {customTitles.size > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {customTitles.size} custom
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 print-hide">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => handleTabChange('summary')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'summary'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Report Summary
              </button>
              <button
                onClick={() => handleTabChange('irr-history')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'irr-history'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                IRR History
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {/* Report Summary Section - Always visible in print */}
        <div className={`${activeTab === 'summary' ? '' : 'hidden'} print:block`}>
          {/* Portfolio Total Average Returns */}
          <div className="mb-6 bg-white shadow-sm rounded-lg border border-gray-200 p-4 product-card print-clean">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Portfolio Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 portfolio-performance-grid">
              <div className="bg-purple-50 rounded-lg p-3 portfolio-performance-card relative flex flex-col justify-center items-center h-24">
                <div className="text-xs font-medium text-purple-700 mb-2">Total Current Average Returns</div>
                {loadingTotalIRR ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                    <div className="text-xs text-purple-600">Calculating...</div>
                  </div>
                ) : realTimeTotalIRR !== null ? (
                  <div className="text-2xl font-bold text-black">
                    {formatIrrWithPrecision(realTimeTotalIRR)}
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-black">N/A</div>
                )}
              </div>
              {reportData.totalValuation !== null && (
                <div className="bg-green-50 rounded-lg p-3 portfolio-performance-card relative flex flex-col justify-center items-center h-24">
                  <div className="text-xs font-medium text-green-700 mb-2">Total Portfolio Value</div>
                  <div className="text-2xl font-bold text-black">
                    {formatCurrencyWithTruncation(reportData.totalValuation)}
                  </div>
                </div>
              )}
              <div className="bg-blue-50 rounded-lg p-3 portfolio-performance-card relative flex flex-col justify-center items-center h-24">
                <div className="text-xs font-medium text-blue-700 mb-2">Total Profit Made</div>
                {(() => {
                  const totalGains = reportData.productSummaries.reduce((sum, product) => 
                    sum + product.current_valuation + product.total_withdrawal + product.total_product_switch_out + product.total_fund_switch_out, 0
                  );
                  const totalCosts = reportData.productSummaries.reduce((sum, product) => 
                    sum + product.total_investment + product.total_regular_investment + product.total_government_uplift + product.total_product_switch_in + product.total_fund_switch_in, 0
                  );
                  const totalProfit = totalGains - totalCosts;
                  return (
                    <div className="text-2xl font-bold text-black">
                      {formatCurrencyWithTruncation(totalProfit)}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>



          {/* Portfolio Summary Table - Moved to top for better printing */}
          <div className="mb-8 product-card print-clean">
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Portfolio Summary</h2>
              <div className="overflow-x-auto product-table">
                <table className="w-full table-fixed divide-y divide-gray-300 landscape-table portfolio-summary-table">
                  <colgroup>
                    <col className="w-[28%]" />
                    <col className="w-[7%]" />
                    <col className="w-[7%]" />
                    <col className="w-[7%]" />
                    <col className="w-[7%]" />
                    <col className="w-[7%]" />
                    <col className="w-[7%]" />
                    <col className="w-[8%]" />
                    <col className="w-[8%]" />
                    <col className="w-[9%]" />
                    <col className="w-[5%]" />
                  </colgroup>
                  <thead className="bg-gray-100">
                    <tr>
                      <th scope="col" className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Product
                      </th>
                      <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Investment
                      </th>
                      <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        <div className="leading-tight">
                          Government<br />Uplift
                        </div>
                      </th>
                      <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        <div className="leading-tight">
                          Product<br />Switch In
                        </div>
                      </th>
                      <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        <div className="leading-tight">
                          Fund<br />Switches
                        </div>
                      </th>
                      <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        <div className="leading-tight">
                          Product<br />Switch Out
                        </div>
                      </th>
                      <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Withdrawal
                      </th>
                      <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide bg-green-100">
                        Valuation
                      </th>
                      <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide bg-blue-100">
                        <div className="leading-tight">
                          Profit<br />Made
                        </div>
                      </th>
                      <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide bg-purple-100">
                        <div className="leading-tight">
                          Average Returns<br />p.a.
                        </div>
                      </th>
                      <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Risk
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {organizeProductsByType(reportData.productSummaries)
                      .filter(product => {
                        // Show all products that are in the report data - if they were selected in the generator, they should appear
                        // The filtering already happened in the ReportGenerator, so we show everything passed to us
                        return true;
                      })
                      .map(product => {
                        const totalGains = product.current_valuation + product.total_withdrawal + product.total_product_switch_out + product.total_fund_switch_out;
                        const totalCosts = product.total_investment + product.total_regular_investment + product.total_government_uplift + product.total_product_switch_in + product.total_fund_switch_in;
                        const profit = totalGains - totalCosts;
                        
                        return (
                          <tr key={product.id} className={`hover:bg-blue-50 ${product.status === 'inactive' ? 'opacity-50 bg-gray-50' : ''}`}>
                            <td className={`product-name-cell text-left ${product.status === 'inactive' ? 'text-gray-500' : 'text-gray-800'}`}>
                              <div className="flex items-start gap-1.5">
                                {product.provider_theme_color && (
                                  <div 
                                    className="w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0" 
                                    style={{ backgroundColor: product.provider_theme_color }}
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs leading-tight">
                                    {generateProductTitle(product, customTitles.get(product.id))}
                                {product.status === 'inactive' && (
                                      <span className="block text-xs text-red-600 font-medium">(Inactive)</span>
                                )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs text-right">
                              {(() => {
                                const formatted = formatCurrencyWithVisualSigning(product.total_investment + product.total_regular_investment, 'investment');
                                return <span className={formatted.className}>{formatted.value}</span>;
                              })()}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs text-right">
                              {(() => {
                                const formatted = formatCurrencyWithVisualSigning(product.total_government_uplift, 'government_uplift');
                                return <span className={formatted.className}>{formatted.value}</span>;
                              })()}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs text-right">
                              {(() => {
                                const formatted = formatCurrencyWithVisualSigning(product.total_product_switch_in, 'product_switch_in');
                                return <span className={formatted.className}>{formatted.value}</span>;
                              })()}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs text-right">
                              {(() => {
                                const formatted = formatCurrencyWithVisualSigning(product.total_fund_switch_out - product.total_fund_switch_in, 'fund_switch');
                                return <span className={formatted.className}>{formatted.value}</span>;
                              })()}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs text-right">
                              {(() => {
                                const formatted = formatCurrencyWithVisualSigning(product.total_product_switch_out, 'product_switch_out');
                                return <span className={formatted.className}>{formatted.value}</span>;
                              })()}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs text-right">
                              {(() => {
                                const formatted = formatCurrencyWithVisualSigning(product.total_withdrawal, 'withdrawal');
                                return <span className={formatted.className}>{formatted.value}</span>;
                              })()}
                            </td>
                            <td className="px-2 py-2 text-xs font-semibold text-primary-700 text-right bg-green-50">
                              {formatCurrencyWithTruncation(product.current_valuation)}
                            </td>
                            <td className="px-2 py-2 text-xs text-right bg-blue-50">
                              <span className={profit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                {formatCurrencyWithTruncation(profit)}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-xs text-right bg-purple-50">
                              {(() => {
                                const portfolioIrr = portfolioIrrValues.get(product.id);
                                if (portfolioIrr !== null && portfolioIrr !== undefined) {
                                  return (
                                    <span className={portfolioIrr >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                      {formatIrrWithPrecision(portfolioIrr)}
                                    </span>
                                  );
                                } else {
                                  return <span className="text-gray-400">N/A</span>;
                                }
                              })()}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs text-right">
                              {product.weighted_risk !== undefined && product.weighted_risk !== null ? (
                                <span className="text-xs font-medium">
                                  {formatWeightedRisk(product.weighted_risk)}
                                </span>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    
                    {/* Portfolio Totals Row */}
                    <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
                      <td className="px-2 py-2 text-xs text-left text-gray-800">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">PORTFOLIO TOTALS</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-xs font-bold text-right text-black">
                        {(() => {
                          const totalAmount = reportData.productSummaries.reduce((sum, product) => 
                            sum + product.total_investment + product.total_regular_investment, 0
                          );
                          const formatted = formatCurrencyWithVisualSigning(totalAmount, 'investment');
                          return <span className="text-black font-bold">{formatted.value}</span>;
                        })()}
                      </td>
                      <td className="px-2 py-2 text-xs font-bold text-right text-black">
                        {(() => {
                          const totalAmount = reportData.productSummaries.reduce((sum, product) => 
                            sum + product.total_government_uplift, 0
                          );
                          const formatted = formatCurrencyWithVisualSigning(totalAmount, 'government_uplift');
                          return <span className="text-black font-bold">{formatted.value}</span>;
                        })()}
                      </td>
                      <td className="px-2 py-2 text-xs font-bold text-right text-black">
                        {(() => {
                          const totalAmount = reportData.productSummaries.reduce((sum, product) => 
                            sum + product.total_product_switch_in, 0
                          );
                          const formatted = formatCurrencyWithVisualSigning(totalAmount, 'product_switch_in');
                          return <span className="text-black font-bold">{formatted.value}</span>;
                        })()}
                      </td>
                      <td className="px-2 py-2 text-xs font-bold text-right text-black">
                        {(() => {
                          const totalAmount = reportData.productSummaries.reduce((sum, product) => 
                            sum + (product.total_fund_switch_out - product.total_fund_switch_in), 0
                          );
                          const formatted = formatCurrencyWithVisualSigning(totalAmount, 'fund_switch');
                          return <span className="text-black font-bold">{formatted.value}</span>;
                        })()}
                      </td>
                      <td className="px-2 py-2 text-xs font-bold text-right text-black">
                        {(() => {
                          const totalAmount = reportData.productSummaries.reduce((sum, product) => 
                            sum + product.total_product_switch_out, 0
                          );
                          const formatted = formatCurrencyWithVisualSigning(totalAmount, 'product_switch_out');
                          return <span className="text-black font-bold">{formatted.value}</span>;
                        })()}
                      </td>
                      <td className="px-2 py-2 text-xs font-bold text-right text-black">
                        {(() => {
                          const totalAmount = reportData.productSummaries.reduce((sum, product) => 
                            sum + product.total_withdrawal, 0
                          );
                          const formatted = formatCurrencyWithVisualSigning(totalAmount, 'withdrawal');
                          return <span className="text-black font-bold">{formatted.value}</span>;
                        })()}
                      </td>
                      <td className="px-2 py-2 text-xs font-bold text-right bg-green-100 text-black">
                        {formatCurrencyWithTruncation(
                          reportData.productSummaries.reduce((sum, product) => 
                            sum + product.current_valuation, 0
                          )
                        )}
                      </td>
                      <td className="px-2 py-2 text-xs font-bold text-right bg-blue-100 text-black">
                        {(() => {
                          const totalGains = reportData.productSummaries.reduce((sum, product) => 
                            sum + product.current_valuation + product.total_withdrawal + product.total_product_switch_out + product.total_fund_switch_out, 0
                          );
                          const totalCosts = reportData.productSummaries.reduce((sum, product) => 
                            sum + product.total_investment + product.total_regular_investment + product.total_government_uplift + product.total_product_switch_in + product.total_fund_switch_in, 0
                          );
                          const totalProfit = totalGains - totalCosts;
                          return (
                            <span className="text-black font-bold">
                              {formatCurrencyWithTruncation(totalProfit)}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-2 py-2 text-xs font-bold text-right bg-purple-100">
                        {loadingTotalIRR ? (
                          <div className="flex items-center justify-end gap-1">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                            <span className="text-xs text-purple-600">Calc...</span>
                          </div>
                        ) : realTimeTotalIRR !== null ? (
                          <span className={realTimeTotalIRR >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                            {formatIrrWithPrecision(realTimeTotalIRR)}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-bold">N/A</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-xs font-bold text-right text-black">
                        {(() => {
                          const totalWeightedRisk = reportData.productSummaries.reduce((sum, product) => {
                            if (product.weighted_risk && product.current_valuation > 0) {
                              return sum + (product.weighted_risk * product.current_valuation);
                            }
                            return sum;
                          }, 0);
                          const totalValuation = reportData.productSummaries.reduce((sum, product) => sum + product.current_valuation, 0);
                          
                          if (totalValuation > 0) {
                            const avgRisk = totalWeightedRisk / totalValuation;
                            return (
                              <span className="text-xs font-bold text-black">
                                {formatWeightedRisk(avgRisk)}
                              </span>
                            );
                          }
                          return <span className="text-black font-bold">N/A</span>;
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="mb-8">
            {organizeProductsByTypeWithHeaders(reportData.productSummaries)
              .map(({ type, products }) => (
                <div key={type} className="mb-12">
                  {/* Product Type Header */}
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-gray-300 pb-2">
                      {type}
                    </h2>
                  </div>
                  
                  {/* Products in this type */}
                  {products
                    .filter(product => {
                      // For inactive products, only show detailed cards if the checkbox was checked
                      if (product.status === 'inactive') {
                        return reportData.showInactiveProducts || showInactiveProductDetails.has(product.id);
                      }
                      return true;
                    })
                    .map(product => (
                <div 
                  key={product.id} 
                  className={`mb-8 bg-white shadow-sm rounded-lg border border-gray-200 p-6 w-full product-card print-clean ${product.status === 'inactive' ? 'opacity-60 bg-gray-50' : ''}`}
                  style={{
                    borderLeft: product.provider_theme_color ? `4px solid ${product.provider_theme_color}` : '4px solid #e5e7eb',
                    borderTop: product.provider_theme_color ? `1px solid ${product.provider_theme_color}` : undefined,
                    borderRight: product.provider_theme_color ? `1px solid ${product.provider_theme_color}` : undefined,
                    borderBottom: product.provider_theme_color ? `1px solid ${product.provider_theme_color}` : undefined,
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    {product.provider_theme_color && (
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: product.provider_theme_color }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-xl font-semibold flex-1 min-w-0 ${product.status === 'inactive' ? 'text-gray-600' : 'text-gray-800'}`}>
                          {generateProductTitle(product, customTitles.get(product.id))}
                        </h3>
                      {product.status === 'inactive' && (
                          <span className="text-sm text-red-600 font-medium whitespace-nowrap">(Inactive)</span>
                      )}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto product-table">
                    <table className="w-full table-fixed divide-y divide-gray-300 landscape-table product-fund-table">
                      <colgroup>
                        <col className="w-[22%]" />
                        <col className="w-[7%]" />
                        <col className="w-[7%]" />
                        <col className="w-[7%]" />
                        <col className="w-[7%]" />
                        <col className="w-[7%]" />
                        <col className="w-[7%]" />
                        <col className="w-[8%]" />
                        <col className="w-[8%]" />
                        <col className="w-[9%]" />
                        <col className="w-[5%]" />
                      </colgroup>
                      <thead className="bg-gray-100">
                        <tr>
                          <th scope="col" className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            Fund Name
                          </th>
                          <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            Investment
                          </th>
                          <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            <div className="leading-tight">
                              Government<br />Uplift
                            </div>
                          </th>
                          <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            <div className="leading-tight">
                              Product<br />Switch In
                            </div>
                          </th>
                          <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            <div className="leading-tight">
                              Fund<br />Switches
                            </div>
                          </th>
                          <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            <div className="leading-tight">
                              Product<br />Switch Out
                            </div>
                          </th>
                          <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            Withdrawal
                          </th>
                          <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide bg-green-100">
                            Valuation
                          </th>
                          <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide bg-blue-100">
                            Profit Made
                          </th>
                          <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide bg-purple-100">
                            Average Returns p.a.
                          </th>
                          <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            Risk
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {product.funds && product.funds.length > 0 ? (
                          <>
                            {product.funds
                              .sort((a, b) => {
                                // First: Check if either is "Previous Funds" (virtual) - these go last
                                if (a.isVirtual && !b.isVirtual) return 1;
                                if (!a.isVirtual && b.isVirtual) return -1;
                                if (a.isVirtual && b.isVirtual) return 0;
                                
                                // Second: Check if either is "Cash" - cash goes after regular funds but before Previous Funds
                                const aIsCash = a.fund_name.toLowerCase().includes('cash');
                                const bIsCash = b.fund_name.toLowerCase().includes('cash');
                                if (aIsCash && !bIsCash) return 1;
                                if (!aIsCash && bIsCash) return -1;
                                
                                // Third: Regular funds in alphabetical order
                                return a.fund_name.localeCompare(b.fund_name);
                              })
                              .map(fund => (
                              <React.Fragment key={fund.id}>
                                <tr 
                                  className={`hover:bg-blue-50 ${fund.isVirtual ? 'bg-gray-100 font-medium' : ''}`}
                                >
                                  <td className="px-2 py-2 text-xs font-medium text-gray-800 text-left">
                                    {fund.fund_name}
                                    {fund.isVirtual && fund.inactiveFundCount && fund.fund_name !== 'Previous Funds' && (
                                      <span className="ml-2 inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800">
                                        {fund.inactiveFundCount} {fund.inactiveFundCount === 1 ? 'fund' : 'funds'}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-2 py-2 text-xs text-right">
                                    {(() => {
                                      const formatted = formatCurrencyWithVisualSigning(fund.total_investment + fund.total_regular_investment, 'investment');
                                      return <span className={formatted.className}>{formatted.value}</span>;
                                    })()}
                                  </td>
                                  <td className="px-2 py-2 text-xs text-right">
                                    {(() => {
                                      const formatted = formatCurrencyWithVisualSigning(fund.total_government_uplift, 'government_uplift');
                                      return <span className={formatted.className}>{formatted.value}</span>;
                                    })()}
                                  </td>
                                  <td className="px-2 py-2 text-xs text-right">
                                    {(() => {
                                      const formatted = formatCurrencyWithVisualSigning(fund.total_product_switch_in, 'product_switch_in');
                                      return <span className={formatted.className}>{formatted.value}</span>;
                                    })()}
                                  </td>
                                  <td className="px-2 py-2 text-xs text-right">
                                    {(() => {
                                      const formatted = formatCurrencyWithVisualSigning(fund.total_fund_switch_out - fund.total_fund_switch_in, 'fund_switch');
                                      return <span className={formatted.className}>{formatted.value}</span>;
                                    })()}
                                  </td>
                                  <td className="px-2 py-2 text-xs text-right">
                                    {(() => {
                                      const formatted = formatCurrencyWithVisualSigning(fund.total_product_switch_out, 'product_switch_out');
                                      return <span className={formatted.className}>{formatted.value}</span>;
                                    })()}
                                  </td>
                                  <td className="px-2 py-2 text-xs text-right">
                                    {(() => {
                                      const formatted = formatCurrencyWithVisualSigning(fund.total_withdrawal, 'withdrawal');
                                      return <span className={formatted.className}>{formatted.value}</span>;
                                    })()}
                                  </td>
                                  <td className="px-2 py-2 text-xs font-semibold text-primary-700 text-right bg-green-50">
                                    {formatCurrencyWithZeroToggle(fund.current_valuation)}
                                  </td>
                                  <td className="px-2 py-2 text-xs text-right bg-blue-50">
                                    {(() => {
                                      const gains = fund.current_valuation + fund.total_withdrawal + fund.total_product_switch_out + fund.total_fund_switch_out;
                                      const costs = fund.total_investment + fund.total_regular_investment + fund.total_government_uplift + fund.total_product_switch_in + fund.total_fund_switch_in;
                                      const profit = gains - costs;
                                      return (
                                        <span className={profit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                          {formatCurrencyWithZeroToggle(profit)}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td className="px-2 py-2 text-xs text-right bg-purple-50">
                                    {fund.irr !== null && fund.irr !== undefined ? (
                                      <span className={fund.irr >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                        {formatIrrWithPrecision(fund.irr)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">N/A</span>
                                    )}
                                  </td>
                                  <td className="px-2 py-2 text-xs text-right">
                                    {fund.fund_name === 'Previous Funds' ? (
                                      <span className="text-gray-500">N/A</span>
                                    ) : fund.risk_factor !== undefined && fund.risk_factor !== null ? (
                                      <span className="text-xs font-medium">
                                        {formatFundRisk(fund.risk_factor)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                </tr>
                              </React.Fragment>
                            ))}

                            {/* Product Total Row */}
                            <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
                              <td className="px-2 py-2 text-xs font-bold text-gray-800 text-left">
                                TOTAL
                              </td>
                              <td className="px-2 py-2 text-xs font-bold text-right text-black">
                                {(() => {
                                  const totalAmount = product.funds.reduce((sum, fund) => sum + fund.total_investment + fund.total_regular_investment, 0);
                                  const formatted = formatCurrencyWithVisualSigning(totalAmount, 'investment');
                                  return <span className="text-black font-bold">{formatted.value}</span>;
                                })()}
                              </td>
                              <td className="px-2 py-2 text-xs font-bold text-right text-black">
                                {(() => {
                                  const totalAmount = product.funds.reduce((sum, fund) => sum + fund.total_government_uplift, 0);
                                  const formatted = formatCurrencyWithVisualSigning(totalAmount, 'government_uplift');
                                  return <span className="text-black font-bold">{formatted.value}</span>;
                                })()}
                              </td>
                              <td className="px-2 py-2 text-xs font-bold text-right text-black">
                                {(() => {
                                  const totalAmount = product.funds.reduce((sum, fund) => sum + fund.total_product_switch_in, 0);
                                  const formatted = formatCurrencyWithVisualSigning(totalAmount, 'product_switch_in');
                                  return <span className="text-black font-bold">{formatted.value}</span>;
                                })()}
                              </td>
                              <td className="px-2 py-2 text-xs font-bold text-right text-black">
                                {(() => {
                                  const totalAmount = product.funds.reduce((sum, fund) => sum + (fund.total_fund_switch_out - fund.total_fund_switch_in), 0);
                                  const formatted = formatCurrencyWithVisualSigning(totalAmount, 'fund_switch');
                                  return <span className="text-black font-bold">{formatted.value}</span>;
                                })()}
                              </td>
                              <td className="px-2 py-2 text-xs font-bold text-right text-black">
                                {(() => {
                                  const totalAmount = product.funds.reduce((sum, fund) => sum + fund.total_product_switch_out, 0);
                                  const formatted = formatCurrencyWithVisualSigning(totalAmount, 'product_switch_out');
                                  return <span className="text-black font-bold">{formatted.value}</span>;
                                })()}
                              </td>
                              <td className="px-2 py-2 text-xs font-bold text-right text-black">
                                {(() => {
                                  const totalAmount = product.funds.reduce((sum, fund) => sum + fund.total_withdrawal, 0);
                                  const formatted = formatCurrencyWithVisualSigning(totalAmount, 'withdrawal');
                                  return <span className="text-black font-bold">{formatted.value}</span>;
                                })()}
                              </td>
                              <td className="px-2 py-2 text-xs font-bold text-right bg-green-100 text-black">
                                {formatCurrencyWithZeroToggle(product.funds.reduce((sum, fund) => sum + fund.current_valuation, 0))}
                              </td>
                              <td className="px-2 py-2 text-xs font-bold text-right bg-blue-100 text-black">
                                {(() => {
                                  const totalGains = product.funds.reduce((sum, fund) => sum + fund.current_valuation + fund.total_withdrawal + fund.total_product_switch_out + fund.total_fund_switch_out, 0);
                                  const totalCosts = product.funds.reduce((sum, fund) => sum + fund.total_investment + fund.total_regular_investment + fund.total_government_uplift + fund.total_product_switch_in + fund.total_fund_switch_in, 0);
                                  const totalProfit = totalGains - totalCosts;
                                  const formatted = formatCurrencyWithVisualSigning(totalProfit, totalProfit >= 0 ? 'investment' : 'withdrawal');
                                  return <span className="text-black font-bold">{formatted.value}</span>;
                                })()}
                              </td>
                              <td className="px-2 py-2 text-xs font-bold text-right bg-purple-100">
                                {(() => {
                                  // Use portfolio IRR value from database instead of calculating from funds
                                  const portfolioIrr = portfolioIrrValues.get(product.id);
                                  if (portfolioIrr !== null && portfolioIrr !== undefined) {
                                    return (
                                      <span className={portfolioIrr >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                                        {formatIrrWithPrecision(portfolioIrr)}
                                      </span>
                                    );
                                  }
                                  return <span className="text-gray-400 font-bold">N/A</span>;
                                })()}
                              </td>
                              <td className="px-2 py-2 text-xs font-bold text-right text-black">
                                {(() => {
                                  // Calculate weighted risk for this product's funds (excluding inactive funds)
                                  const activeFunds = product.funds.filter(fund => !fund.isVirtual && fund.risk_factor !== undefined && fund.risk_factor !== null && fund.current_valuation > 0);
                                  if (activeFunds.length > 0) {
                                    let totalWeightedValue = 0;
                                    let weightedRisk = 0;
                                    
                                    activeFunds.forEach(fund => {
                                      const valuation = fund.current_valuation;
                                      totalWeightedValue += valuation;
                                      weightedRisk += fund.risk_factor! * valuation;
                                    });
                                    
                                    weightedRisk = totalWeightedValue > 0 ? weightedRisk / totalWeightedValue : 0;
                                    return (
                                      <span className="text-xs font-bold text-black">
                                        {formatWeightedRisk(weightedRisk)}
                                      </span>
                                    );
                                  }
                                  return <span className="text-black font-bold">N/A</span>;
                                })()}
                              </td>
                            </tr>
                          </>
                        ) : (
                          <tr>
                            <td colSpan={11} className="px-2 py-2 text-center text-gray-500">
                              No funds available for this product
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                    ))}
                </div>
              ))}
          </div>


        </div>

        {/* IRR History Section - Always visible in print, force page break before */}
        <div className={`irr-history-section ${activeTab === 'irr-history' ? '' : 'hidden'} print:block print:mt-8`}>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">IRR History</h2>
          </div>
          
          {loadingIrrHistory ? (
            <div className="flex items-center justify-center py-12 print-hide">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading IRR history...</p>
              </div>
            </div>
          ) : irrHistoryData ? (
            <div className="space-y-8">
              {(() => {
                // Organize products and create mapping for IRR history data
                const organizedProducts = organizeProductsByType(reportData.productSummaries);
                
                return organizedProducts.map((product, index) => {
                  const originalIndex = reportData.productSummaries.findIndex(p => p.id === product.id);
                  const productHistory = irrHistoryData[originalIndex];
                
                // Get all unique dates from both portfolio and fund IRR history
                const allDates = new Set<string>();
                
                // Add portfolio IRR dates
                if (productHistory.portfolio_historical_irr) {
                  productHistory.portfolio_historical_irr.forEach((record: any) => {
                    allDates.add(record.irr_date);
                  });
                }
                
                // Add fund IRR dates
                if (productHistory.funds_historical_irr) {
                  productHistory.funds_historical_irr.forEach((fund: any) => {
                    if (fund.historical_irr) {
                      fund.historical_irr.forEach((record: any) => {
                        allDates.add(record.irr_date);
                      });
                    }
                  });
                }
                
                // Sort dates in descending order (most recent first)
                const allSortedDates = Array.from(allDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                
                // Exclude the most recent date (current IRR) from historical columns
                // Keep only historical dates (excluding the current/latest IRR)
                const sortedDates = allSortedDates.slice(1, 13); // Skip first (current) and take next 12 historical dates
                
                // Create lookup maps for quick access
                const portfolioIrrMap = new Map();
                if (productHistory.portfolio_historical_irr) {
                  productHistory.portfolio_historical_irr.forEach((record: any) => {
                    portfolioIrrMap.set(record.irr_date, record.irr_result);
                  });
                }
                
                const fundIrrMaps = new Map();
                if (productHistory.funds_historical_irr) {
                  productHistory.funds_historical_irr.forEach((fund: any) => {
                    const fundMap = new Map();
                    if (fund.historical_irr) {
                      fund.historical_irr.forEach((record: any) => {
                        fundMap.set(record.irr_date, record.irr_result);
                      });
                    }
                    fundIrrMaps.set(fund.portfolio_fund_id, fundMap);
                  });
                }

                return (
                  <div 
                    key={index} 
                    className={`product-card bg-white shadow-sm rounded-lg border border-gray-200 p-6 w-full print-clean ${product?.status === 'inactive' ? 'opacity-60 bg-gray-50' : ''}`}
                    style={{
                      borderLeft: product?.provider_theme_color ? `4px solid ${product.provider_theme_color}` : '4px solid #e5e7eb',
                      borderTop: product?.provider_theme_color ? `1px solid ${product.provider_theme_color}` : undefined,
                      borderRight: product?.provider_theme_color ? `1px solid ${product.provider_theme_color}` : undefined,
                      borderBottom: product?.provider_theme_color ? `1px solid ${product.provider_theme_color}` : undefined,
                    }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      {product?.provider_theme_color && (
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: product.provider_theme_color }}
                        />
                      )}
                      <h3 className={`text-xl font-semibold ${product?.status === 'inactive' ? 'text-gray-600' : 'text-gray-800'}`}>
                        {[product?.product_type, product?.provider_name, product?.product_owner_name].filter(Boolean).join(' - ')}
                        {product?.status === 'inactive' && (
                          <span className="ml-2 text-sm text-red-600 font-medium">(Inactive)</span>
                        )}
                      </h3>
                    </div>

                    <div className="overflow-x-auto product-table">
                      <table className="w-full table-auto divide-y divide-gray-300 landscape-table">
                        <thead className="bg-gray-100">
                          <tr>
                            <th scope="col" className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                              Fund Name
                            </th>
                            <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                              Current "Risk" 1-7 scale, (7 High)
                            </th>
                            <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide bg-purple-100">
                              Current Average Return p.a.
                            </th>
                            {sortedDates.map((date) => (
                              <th key={date} scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                {(() => {
                                  const dateObj = new Date(date);
                                  const year = dateObj.getFullYear();
                                  const month = dateObj.toLocaleDateString('en-US', { month: 'long' });
                                  return `${year} ${month}`;
                                })()}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {/* Fund Rows */}
                          {productHistory.funds_historical_irr && productHistory.funds_historical_irr.length > 0 ? (
                            (() => {
                              // Separate active and inactive funds
                              const activeFunds = productHistory.funds_historical_irr.filter((fund: any) => 
                                fund.fund_status === 'active' || fund.fund_status === null
                              );
                              const inactiveFunds = productHistory.funds_historical_irr.filter((fund: any) => 
                                fund.fund_status === 'inactive'
                              );
                              
                              // Create aggregated Previous Funds entry if there are inactive funds
                              const processedFunds = [...activeFunds];
                              
                              if (inactiveFunds.length > 0) {
                                // Aggregate IRR data from all inactive funds
                                const aggregatedIrrMap = new Map();
                                
                                inactiveFunds.forEach((fund: any) => {
                                  if (fund.historical_irr) {
                                    fund.historical_irr.forEach((record: any) => {
                                      const date = record.irr_date;
                                      if (!aggregatedIrrMap.has(date)) {
                                        aggregatedIrrMap.set(date, []);
                                      }
                                      if (record.irr_result !== null && record.irr_result !== undefined) {
                                        aggregatedIrrMap.get(date).push(record.irr_result);
                                      }
                                    });
                                  }
                                });
                                
                                // Calculate average IRR for each date
                                const previousFundsIrrMap = new Map();
                                aggregatedIrrMap.forEach((irrs, date) => {
                                  if (irrs.length > 0) {
                                    const avgIrr = irrs.reduce((sum: number, irr: number) => sum + irr, 0) / irrs.length;
                                    previousFundsIrrMap.set(date, avgIrr);
                                  }
                                });
                                
                                // Create Previous Funds entry
                                const previousFundsEntry = {
                                  portfolio_fund_id: 'previous_funds',
                                  fund_name: 'Previous Funds',
                                  fund_status: 'inactive',
                                  risk_factor: null,
                                  isin_number: null,
                                  historical_irr: Array.from(previousFundsIrrMap.entries()).map(([date, irr]) => ({
                                    irr_date: date,
                                    irr_result: irr
                                  })),
                                  isVirtual: true,
                                  inactiveFundCount: inactiveFunds.length
                                };
                                
                                // Update fundIrrMaps to include Previous Funds data
                                fundIrrMaps.set('previous_funds', previousFundsIrrMap);
                                
                                processedFunds.push(previousFundsEntry);
                              }
                              
                              return processedFunds.map((fund: any, fundIndex: number) => {
                                const fundIrrMap = fundIrrMaps.get(fund.portfolio_fund_id) || new Map();
                                
                                return (
                                  <tr key={fundIndex} className={`hover:bg-blue-50 ${fund.isVirtual ? 'bg-gray-100 font-medium' : ''}`}>
                                    <td className="px-2 py-2 text-xs font-medium text-gray-800 text-left">
                                      {fund.fund_name}
                                      {fund.isVirtual && fund.inactiveFundCount && (
                                        <span className="ml-2 inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800">
                                          {fund.inactiveFundCount} {fund.inactiveFundCount === 1 ? 'fund' : 'funds'}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-2 py-2 text-xs text-right">
                                      {fund.fund_name === 'Previous Funds' ? (
                                        <span className="text-gray-500">N/A</span>
                                      ) : fund.risk_factor !== null && fund.risk_factor !== undefined ? (
                                        <span className="text-xs font-medium">
                                          {formatFundRisk(fund.risk_factor)}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </td>
                                    <td className="px-2 py-2 text-xs text-right bg-purple-50">
                                      {(() => {
                                        // Show current IRR (latest/most recent) for this fund, not historical average
                                        if (fund.historical_irr && fund.historical_irr.length > 0) {
                                          // Sort by date descending to get the most recent IRR
                                          const sortedIrrs = fund.historical_irr
                                            .filter((record: any) => record.irr_result !== null && record.irr_result !== undefined)
                                            .sort((a: any, b: any) => new Date(b.irr_date).getTime() - new Date(a.irr_date).getTime());
                                          
                                          if (sortedIrrs.length > 0) {
                                            const currentIrr = sortedIrrs[0].irr_result; // Most recent IRR
                                            return (
                                              <span className={currentIrr >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                                {currentIrr.toFixed(1)}%
                                              </span>
                                            );
                                          }
                                        }
                                        return <span className="text-gray-400">N/A</span>;
                                      })()}
                                    </td>
                                    {sortedDates.map((date) => (
                                      <td key={date} className="px-2 py-2 text-xs text-right">
                                        {(() => {
                                          const irrValue = fundIrrMap.get(date);
                                          if (irrValue !== null && irrValue !== undefined) {
                                            return (
                                              <span className={irrValue >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                {irrValue.toFixed(1)}%
                                              </span>
                                            );
                                          }
                                          return <span className="text-gray-400">N/A</span>;
                                        })()}
                                      </td>
                                    ))}
                                  </tr>
                                );
                              });
                            })()
                          ) : (
                            <tr>
                              <td colSpan={3 + sortedDates.length} className="px-2 py-2 text-center text-gray-500">
                                No IRR history available for this product
                              </td>
                            </tr>
                          )}

                          {/* Product Total Row */}
                          <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                            <td className="px-2 py-2 text-xs font-bold text-gray-800 text-left">
                              TOTAL
                            </td>
                            <td className="px-2 py-2 text-xs font-bold text-right text-gray-800">
                              {(() => {
                                // Calculate weighted risk for this product's funds (excluding inactive funds)
                                // Use fund valuations from the report summary data for weighting
                                let weightedRisk = 0;
                                let totalWeightedValue = 0;
                                
                                if (productHistory.funds_historical_irr && product?.funds) {
                                  // Create a map of fund names to their current valuations from report summary
                                  const fundValuationMap = new Map();
                                  product.funds.forEach((summaryFund: any) => {
                                    if (!summaryFund.isVirtual) {
                                      fundValuationMap.set(summaryFund.fund_name, summaryFund.current_valuation || 0);
                                    }
                                  });
                                  
                                  const fundsWithRisk = productHistory.funds_historical_irr.filter(
                                    (fund: any) => fund.risk_factor !== undefined && 
                                           fund.risk_factor !== null && 
                                           fund.fund_status !== 'inactive' &&
                                           !fund.fund_name?.includes('Previous Funds')
                                  );
                                  
                                  fundsWithRisk.forEach((fund: any) => {
                                    const valuation = fundValuationMap.get(fund.fund_name) || 0;
                                    weightedRisk += fund.risk_factor * valuation;
                                    totalWeightedValue += valuation;
                                  });
                                  
                                  weightedRisk = totalWeightedValue > 0 ? weightedRisk / totalWeightedValue : 0;
                                }
                                
                                if (totalWeightedValue > 0) {
                                  return (
                                    <span className="text-xs font-bold">
                                      {formatWeightedRisk(weightedRisk)}
                                    </span>
                                  );
                                } else {
                                  // Check if we have funds with risk factors but zero valuations
                                  const fundsWithRiskFactors = productHistory.funds_historical_irr?.filter(
                                    (fund: any) => fund.risk_factor !== undefined && 
                                           fund.risk_factor !== null && 
                                           fund.fund_status !== 'inactive' &&
                                           !fund.fund_name?.includes('Previous Funds')
                                  ) || [];
                                  
                                  if (fundsWithRiskFactors.length > 0) {
                                    // If we have funds with risk factors but zero total valuation, show 0.0
                                    return (
                                      <span className="text-xs font-bold">
                                        0.0
                                      </span>
                                    );
                                  } else {
                                    // If no funds have risk factors, show N/A
                                    return <span className="text-gray-400 font-bold">N/A</span>;
                                  }
                                }
                              })()}
                            </td>
                            <td className="px-2 py-2 text-xs font-bold text-right text-gray-800 bg-purple-50">
                              {(() => {
                                // Show current IRR from portfolio_irr_values (not historical average)
                                const currentIrr = portfolioIrrValues.get(product.id);
                                if (currentIrr !== null && currentIrr !== undefined) {
                                  return (
                                    <span className={currentIrr >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                                      {currentIrr.toFixed(1)}%
                                    </span>
                                  );
                                }
                                return <span className="text-gray-400 font-bold">N/A</span>;
                              })()}
                            </td>
                            {sortedDates.map((date) => (
                              <td key={date} className="px-2 py-2 text-xs font-bold text-right text-gray-800">
                                {(() => {
                                  const portfolioIrr = portfolioIrrMap.get(date);
                                  if (portfolioIrr !== null && portfolioIrr !== undefined) {
                                    return (
                                      <span className={portfolioIrr >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                                        {portfolioIrr.toFixed(1)}%
                                      </span>
                                    );
                                  }
                                  return <span className="text-gray-400 font-bold">N/A</span>;
                                })()}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
                });
              })()}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 print-hide">
              Click "IRR History" tab to load historical data
            </div>
          )}
        </div>
      </div>

      {/* Product Title Modal */}
      <ProductTitleModal />
    </div>
  );
};

export default ReportDisplay;