/**
 * IRRCalculationService - Centralized IRR calculation orchestration
 * Part of Phase 1 refactoring - extracted from ReportDisplay component
 * 
 * This service orchestrates IRR calculations by coordinating existing IRR services
 * and managing the specific IRR data flows needed for report display.
 * 
 * It integrates with:
 * - irrDataService.ts (smart IRR fetching)
 * - historicalIRRService.ts (historical IRR data)
 * - api.ts (direct API calls)
 */

import type {
  IIRRCalculationService,
  IRRCalculationOptions,
  IRRCalculationResult,
  PortfolioIRRMap,
  IRRHistoryData
} from '../../types/reportServices';

import type {
  ProductPeriodSummary,
  ReportData
} from '../../types/reportTypes';

import { AxiosInstance } from 'axios';
import { createIRRDataService, IRRDataService } from '../irrDataService';
import historicalIRRService from '../historicalIRRService';

export class IRRCalculationService implements IIRRCalculationService {
  private api: AxiosInstance;
  private irrDataService: IRRDataService;
  private options: IRRCalculationOptions;

  constructor(api: AxiosInstance, initialOptions: IRRCalculationOptions = {}) {
    this.api = api;
    this.irrDataService = createIRRDataService(api);
    
    // Initialize with default options
    this.options = {
      enableLogging: true,
      cacheResults: true,
      retryAttempts: 1,
      ...initialOptions
    };
  }

  // =============================================================================
  // CONFIGURATION METHODS
  // =============================================================================

  updateOptions(newOptions: IRRCalculationOptions): void {
    this.options = {
      ...this.options,
      ...newOptions
    };
  }

  getOptions(): IRRCalculationOptions {
    return { ...this.options };
  }

  // =============================================================================
  // PORTFOLIO IRR METHODS (extracted from fetchPortfolioIrrValues)
  // =============================================================================

  /**
   * Fetch portfolio IRR values for all products
   * Extracted from ReportDisplay.fetchPortfolioIrrValues (lines 642-700)
   */
  async fetchPortfolioIrrValues(
    productSummaries: ProductPeriodSummary[]
  ): Promise<PortfolioIRRMap> {
    if (!productSummaries || productSummaries.length === 0) {
      this.log('No product summaries provided');
      return new Map();
    }
    
    try {
      this.log('Fetching portfolio IRR values from database...');
      
      const productIds = productSummaries.map(product => product.id);
      this.log('Product IDs:', productIds);
      
      // Fetch latest portfolio IRR values for each product
      const irrPromises = productIds.map(async (productId) => {
        return this.fetchSingleProductIRR(productId);
      });
      
      const irrResults = await Promise.all(irrPromises);
      
      // Create a map of product_id to IRR value
      const irrMap = new Map<number, number>();
      irrResults.forEach(({ productId, irr }) => {
        if (irr !== null) {
          irrMap.set(productId, irr);
        }
      });
      
      this.log('Final IRR values map:', Object.fromEntries(irrMap));
      return irrMap;
      
    } catch (error) {
      console.error('Error fetching portfolio IRR values:', error);
      return new Map();
    }
  }

  /**
   * Fetch IRR for a single product
   * Helper method extracted from the product loop in fetchPortfolioIrrValues
   */
  private async fetchSingleProductIRR(productId: number): Promise<{ productId: number; irr: number | null }> {
    try {
      // First, get the portfolio_id for this product from client_products
      this.log(`Getting portfolio ID for product ${productId}...`);
      const clientProductResponse = await this.api.get(`/client_products/${productId}`);
      
      if (!clientProductResponse.data) {
        console.warn(`No client product found for product ${productId}`);
        return { productId, irr: null };
      }
      
      // Get the portfolio_id from the client product
      const portfolioId = clientProductResponse.data.portfolio_id;
      if (!portfolioId) {
        console.warn(`No portfolio_id found for product ${productId}`);
        return { productId, irr: null };
      }
      
      this.log(`Product ${productId} maps to portfolio ${portfolioId}`);
      
      // Test both endpoints to see which one works
              this.log(`Fetching IRR for portfolio ${portfolioId}...`);
      
      // Use the correct endpoint (hyphen, not underscore)
      const response = await this.api.get(`/api/portfolios/${portfolioId}/latest-irr`);
      // Fix: Properly handle zero values - only convert undefined to null
      const irrValue = response.data?.irr_result !== undefined ? response.data.irr_result : null;
      
      this.log(`Product ${productId} (portfolio ${portfolioId}) IRR:`, irrValue);
      return { productId, irr: irrValue };
      
    } catch (error) {
      console.warn(`Failed to fetch IRR for product ${productId}:`, error);
      return { productId, irr: null };
    }
  }

  // =============================================================================
  // HISTORICAL IRR METHODS (extracted from fetchIrrHistory)
  // =============================================================================

  /**
   * Process historical IRR data for report display
   * Extracted from ReportDisplay.fetchIrrHistory (lines 702-794)
   */
  async processHistoricalIRRData(reportData: ReportData): Promise<IRRHistoryData[]> {
    if (!reportData || !reportData.productSummaries) {
      this.log('No report data provided');
      return [];
    }

    // Check if we have selected historical IRR dates from report generation
    if (!reportData.selectedHistoricalIRRDates || !reportData.availableHistoricalIRRDates) {
      this.log('No selected historical IRR dates available');
      return [];
    }
    
    try {
      this.log('Using pre-selected historical IRR dates from report generation');
      this.log('Selected dates:', reportData.selectedHistoricalIRRDates);
      this.log('Available dates:', reportData.availableHistoricalIRRDates);
      
      // Check if we have pre-fetched raw historical IRR data to avoid duplicate API calls
      if (reportData.rawHistoricalIRRData) {
        this.log('🎯 [OPTIMIZATION] Using pre-fetched historical IRR data, avoiding duplicate API calls');
        
        // Create the IRR history data structure using pre-fetched data
        const irrHistoryPromises = reportData.productSummaries.map(product => {
          const rawHistoricalData = reportData.rawHistoricalIRRData!.get(product.id);
          return this.processProductHistoricalIRRWithRawData(product, reportData.selectedHistoricalIRRDates!, rawHistoricalData);
        });
        
        const irrHistoryResults = await Promise.all(irrHistoryPromises);
        
        this.log('🎯 [OPTIMIZATION] Processed historical IRR data using pre-fetched data - no API calls made');
        return irrHistoryResults;
      } else {
        this.log('⚠️ No pre-fetched historical IRR data available, falling back to API calls');
        
        // Fallback to original method with API calls
        const irrHistoryPromises = reportData.productSummaries.map(product => {
          return this.processProductHistoricalIRR(product, reportData.selectedHistoricalIRRDates!);
        });
        
        const irrHistoryResults = await Promise.all(irrHistoryPromises);
        
        this.log('Final processed historical IRR data:', irrHistoryResults);
        return irrHistoryResults;
      }
    } catch (error) {
      // Handle any errors during historical IRR processing
      console.error('Error processing historical IRR data:', error);
      return [];
    }
  }

  /**
   * Process historical IRR data for a single product
   * Helper method extracted from the product loop in fetchIrrHistory
   */
  private async processProductHistoricalIRR(
    product: ProductPeriodSummary, 
    selectedHistoricalIRRDates: Record<number, string[]>
  ): Promise<IRRHistoryData> {
    const selectedDates = selectedHistoricalIRRDates[product.id] || [];
    this.log(`Product ${product.id} (${product.product_name}) selected dates:`, selectedDates);
    
    // Fetch actual historical IRR data from the API
    let portfolioHistoricalIrr: any[] = [];
    
    try {
      // Fetch historical IRR data for this product from the API
      const historicalResponse = await historicalIRRService.getPortfolioHistoricalIRR(product.id, 24); // Get more records to cover selected dates
      
      if (historicalResponse && historicalResponse.portfolio_historical_irr) {
        this.log(`Fetched ${historicalResponse.portfolio_historical_irr.length} historical IRR records for product ${product.id}`);
        
        // Create portfolio historical IRR data based on actual historical values
        portfolioHistoricalIrr = selectedDates.map(dateStr => {
          // Convert YYYY-MM format to YYYY-MM-DD format for comparison
          const targetMonth = dateStr.length === 7 ? dateStr : dateStr.substring(0, 7);
          
          // Find the closest historical IRR record for this month
          const matchingRecord = historicalResponse.portfolio_historical_irr.find((record: any) => {
            const recordMonth = record.irr_date.substring(0, 7); // Extract YYYY-MM from the date
            return recordMonth === targetMonth;
          });
          
          const fullDate = dateStr.length === 7 ? `${dateStr}-01` : dateStr;
          
          return {
            irr_id: matchingRecord?.irr_id || null,
            portfolio_id: matchingRecord?.portfolio_id || null,
            irr_date: fullDate,
            irr_result: matchingRecord && matchingRecord.irr_result !== null ? parseFloat(String(matchingRecord.irr_result)) : null,
            portfolio_valuation_id: matchingRecord?.portfolio_valuation_id || null,
            portfolio_name: matchingRecord?.portfolio_name || null,
            product_name: matchingRecord?.product_name || product.product_name,
            provider_name: matchingRecord?.provider_name || null
          };
        });
        
        this.log(`Created ${portfolioHistoricalIrr.length} portfolio historical IRR records for product ${product.id}:`, portfolioHistoricalIrr);
      } else {
        this.log(`No historical IRR data found for product ${product.id}, using current IRR as fallback`);
        // Fallback to current IRR if no historical data available
        portfolioHistoricalIrr = selectedDates.map(dateStr => {
          const fullDate = dateStr.length === 7 ? `${dateStr}-01` : dateStr;
          return {
            irr_date: fullDate,
            irr_result: product.irr
          };
        });
      }
    } catch (error) {
      console.error(`Error fetching historical IRR for product ${product.id}:`, error);
      // Fallback to current IRR if error occurs
      portfolioHistoricalIrr = selectedDates.map(dateStr => {
        const fullDate = dateStr.length === 7 ? `${dateStr}-01` : dateStr;
        return {
          irr_date: fullDate,
          irr_result: product.irr
        };
      });
    }
    
    // Create funds historical IRR data using the fund's historical_irr and historical_dates arrays
    const fundsHistoricalIrr = product.funds?.map(fund => {
      // Create historical IRR records for this fund based on selected dates
      const fundHistoricalRecords = selectedDates.map((dateStr) => {
        // Get the corresponding IRR value from the fund's historical data
        let irrValue = null;
        
        if (fund.historical_irr && fund.historical_dates) {
          // Find the index of this date in the fund's historical dates
          const dateIndex = fund.historical_dates.findIndex(histDate => {
            // Handle both YYYY-MM and YYYY-MM-DD formats
            const normalizedHistDate = histDate.length === 7 ? histDate : histDate.substring(0, 7);
            const normalizedSelectedDate = dateStr.length === 7 ? dateStr : dateStr.substring(0, 7);
            return normalizedHistDate === normalizedSelectedDate;
          });
          
          if (dateIndex >= 0 && fund.historical_irr[dateIndex] !== undefined) {
            irrValue = fund.historical_irr[dateIndex];
          }
        }
        
        // Convert YYYY-MM format to YYYY-MM-DD format for consistency
        const fullDate = dateStr.length === 7 ? `${dateStr}-01` : dateStr;
        
        return {
          irr_date: fullDate,
          irr_result: irrValue
        };
      });
      
      return {
        portfolio_fund_id: fund.id,
        fund_name: fund.fund_name,
        fund_status: fund.status,
        risk_factor: fund.risk_factor ?? null,
        isin_number: fund.isin_number ?? null,
        historical_irr: fundHistoricalRecords,
        isVirtual: fund.isVirtual,
        inactiveFundCount: fund.inactiveFundCount
      };
    }) || [];

    const result: IRRHistoryData = {
      product_id: product.id,
      product_name: product.product_name,
      portfolio_historical_irr: portfolioHistoricalIrr,
      funds_historical_irr: fundsHistoricalIrr
    };
    
    this.log(`Created data structure for product ${product.id}:`, result);
    return result;
  }

  /**
   * Process historical IRR data for a single product using pre-fetched raw data
   * Optimized version that avoids duplicate API calls
   */
  private async processProductHistoricalIRRWithRawData(
    product: ProductPeriodSummary, 
    selectedHistoricalIRRDates: Record<number, string[]>,
    rawHistoricalData: any
  ): Promise<IRRHistoryData> {
    const selectedDates = selectedHistoricalIRRDates[product.id] || [];
    this.log(`🎯 [OPTIMIZATION] Product ${product.id} (${product.product_name}) using pre-fetched data for dates:`, selectedDates);
    
    let portfolioHistoricalIrr: any[] = [];
    
    try {
      if (rawHistoricalData && rawHistoricalData.portfolio_historical_irr) {
        this.log(`🎯 [OPTIMIZATION] Using ${rawHistoricalData.portfolio_historical_irr.length} pre-fetched portfolio IRR records for product ${product.id}`);
        
        // Create portfolio historical IRR data based on pre-fetched values
        portfolioHistoricalIrr = selectedDates.map(dateStr => {
          // Convert YYYY-MM format to YYYY-MM-DD format for comparison
          const targetMonth = dateStr.length === 7 ? dateStr : dateStr.substring(0, 7);
          
          // Find the closest historical IRR record for this month
          const matchingRecord = rawHistoricalData.portfolio_historical_irr.find((record: any) => {
            const recordMonth = record.irr_date.substring(0, 7); // Extract YYYY-MM from the date
            return recordMonth === targetMonth;
          });
          
          const fullDate = dateStr.length === 7 ? `${dateStr}-01` : dateStr;
          
          return {
            irr_id: matchingRecord?.irr_id || null,
            portfolio_id: matchingRecord?.portfolio_id || null,
            irr_date: fullDate,
            irr_result: matchingRecord && matchingRecord.irr_result !== null ? parseFloat(String(matchingRecord.irr_result)) : null,
            portfolio_valuation_id: matchingRecord?.portfolio_valuation_id || null,
            portfolio_name: matchingRecord?.portfolio_name || null,
            product_name: matchingRecord?.product_name || product.product_name,
            provider_name: matchingRecord?.provider_name || null
          };
        });
        
        this.log(`🎯 [OPTIMIZATION] Created ${portfolioHistoricalIrr.length} portfolio historical IRR records for product ${product.id} using pre-fetched data`);
      } else {
        this.log(`⚠️ No pre-fetched historical IRR data found for product ${product.id}, using current IRR as fallback`);
        // Fallback to current IRR if no historical data available
        portfolioHistoricalIrr = selectedDates.map(dateStr => {
          const fullDate = dateStr.length === 7 ? `${dateStr}-01` : dateStr;
          return {
            irr_date: fullDate,
            irr_result: product.irr
          };
        });
      }
    } catch (error) {
      console.error(`Error processing pre-fetched historical IRR data for product ${product.id}:`, error);
      // Fallback to current IRR
      portfolioHistoricalIrr = selectedDates.map(dateStr => {
        const fullDate = dateStr.length === 7 ? `${dateStr}-01` : dateStr;
        return {
          irr_date: fullDate,
          irr_result: product.irr
        };
      });
    }

    // Create funds historical IRR data using pre-fetched data
    const fundsHistoricalIrr = rawHistoricalData?.funds_historical_irr?.map((fund: any) => {
      const fundHistoricalRecords = selectedDates.map(dateStr => {
        let irrValue: number | null = null;
        
        // Find matching IRR value for this date
        if (fund.historical_irr && fund.historical_irr.length > 0) {
          const dateIndex = fund.historical_irr.findIndex((record: any) => {
            const histDate = record.irr_date;
            // Handle both YYYY-MM and YYYY-MM-DD formats
            const normalizedHistDate = histDate.length === 7 ? histDate : histDate.substring(0, 7);
            const normalizedSelectedDate = dateStr.length === 7 ? dateStr : dateStr.substring(0, 7);
            return normalizedHistDate === normalizedSelectedDate;
          });
          
          if (dateIndex >= 0 && fund.historical_irr[dateIndex] !== undefined) {
            irrValue = fund.historical_irr[dateIndex].irr_result;
          }
        }
        
        // Convert YYYY-MM format to YYYY-MM-DD format for consistency
        const fullDate = dateStr.length === 7 ? `${dateStr}-01` : dateStr;
        
        return {
          irr_date: fullDate,
          irr_result: irrValue
        };
      });
      
      return {
        portfolio_fund_id: fund.portfolio_fund_id,
        fund_name: fund.fund_name,
        fund_status: fund.fund_status || 'active',
        risk_factor: fund.risk_factor ?? null,
        isin_number: fund.isin_number ?? null,
        historical_irr: fundHistoricalRecords,
        isVirtual: fund.isVirtual,
        inactiveFundCount: fund.inactiveFundCount
      };
    }) || [];

    const result: IRRHistoryData = {
      product_id: product.id,
      product_name: product.product_name,
      portfolio_historical_irr: portfolioHistoricalIrr,
      funds_historical_irr: fundsHistoricalIrr
    };
    
    this.log(`🎯 [OPTIMIZATION] Created data structure for product ${product.id} using pre-fetched data:`, result);
    return result;
  }

  // =============================================================================
  // REAL-TIME TOTAL IRR METHODS (extracted from calculateRealTimeTotalIRR)
  // =============================================================================

  /**
   * Calculate real-time total IRR across all products
   * Extracted from ReportDisplay.calculateRealTimeTotalIRR (lines 795-860)
   */
  async calculateRealTimeTotalIRR(reportData: ReportData): Promise<IRRCalculationResult> {
    if (!reportData || !reportData.productSummaries) {
      this.log('No report data provided');
      return { success: false, irr: null, error: 'No report data provided' };
    }
    
    try {
      this.log('Calculating aggregated IRR using multiple portfolio funds...');
      
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

      this.log('Collected portfolio fund IDs:', allPortfolioFundIds);
      
      if (allPortfolioFundIds.length === 0) {
        console.warn('No portfolio fund IDs found');
        return { success: false, irr: null, error: 'No portfolio fund IDs found' };
      }

      // Convert partial date (YYYY-MM) to full date (YYYY-MM-DD) by using last day of month
      let irrDate = reportData.selectedValuationDate;
      if (irrDate && irrDate.length === 7) { // Format: YYYY-MM
        const [year, month] = irrDate.split('-');
        const lastDayOfMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
        irrDate = `${year}-${month}-${lastDayOfMonth.toString().padStart(2, '0')}`;
      }

      this.log(`Using IRR date: ${irrDate}`);

      // Call the multiple portfolio funds IRR endpoint
      const response = await this.api.post('/portfolio_funds/multiple/irr', {
        portfolio_fund_ids: allPortfolioFundIds,
        irr_date: irrDate
      });

      this.log('API Response:', response.data);

      if (response.data && response.data.irr_percentage !== null && response.data.irr_percentage !== undefined) {
        const totalIRR = response.data.irr_percentage;
        this.log(`Calculated total IRR: ${totalIRR}%`);
        
        return { 
          success: true, 
          irr: totalIRR, 
          metadata: {
            fundCount: allPortfolioFundIds.length,
            irrDate: irrDate || undefined,
            method: 'multiple_portfolio_funds_api'
          }
        };
      } else {
        console.warn('API returned null or undefined IRR result');
        return { success: false, irr: null, error: 'API returned null IRR result' };
      }
      
    } catch (error) {
      console.error('Error calculating real-time total IRR:', error);
      return { 
        success: false, 
        irr: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Get all portfolio fund IDs from report data
   * Helper method for IRR calculations
   */
  extractPortfolioFundIds(reportData: ReportData): number[] {
    const allPortfolioFundIds: number[] = [];
    
    reportData.productSummaries?.forEach(product => {
      if (product.funds) {
        product.funds.forEach(fund => {
          if (!fund.isVirtual && fund.id) {
            allPortfolioFundIds.push(fund.id);
          }
        });
      }
    });
    
    return allPortfolioFundIds;
  }

  /**
   * Convert partial date to full date format
   * Helper method for date formatting in IRR calculations
   */
  normalizeIRRDate(date: string): string {
    if (date && date.length === 7) { // Format: YYYY-MM
      const [year, month] = date.split('-');
      const lastDayOfMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
      return `${year}-${month}-${lastDayOfMonth.toString().padStart(2, '0')}`;
    }
    return date;
  }

  // =============================================================================
  // INTEGRATION WITH EXISTING SERVICES
  // =============================================================================

  /**
   * Get stored IRR using existing IRRDataService
   */
  async getStoredPortfolioIRR(portfolioId: number): Promise<number | null> {
    return this.irrDataService.getStoredPortfolioIRR(portfolioId);
  }

  /**
   * Get historical IRR using existing HistoricalIRRService
   */
  async getHistoricalIRR(productId: number, limit: number = 12) {
    return historicalIRRService.getCombinedHistoricalIRR(productId, limit);
  }

  /**
   * Calculate IRR using existing IRRDataService
   */
  async calculateHistoricalIRR(portfolioFundIds: number[], endDate?: string): Promise<number | null> {
    return this.irrDataService.calculateHistoricalIRR({
      portfolioFundIds,
      endDate
    });
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Logging helper that respects enableLogging option
   */
  private log(...args: any[]): void {
    if (this.options.enableLogging) {
      console.log(...args);
    }
  }

  /**
   * Retry mechanism for failed IRR calculations
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
    attempts: number = this.options.retryAttempts || 1
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let i = 0; i <= attempts; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < attempts) {
          this.log(`Attempt ${i + 1} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        }
      }
    }
    
    throw lastError;
  }
}

// Export factory function for consistent creation
export const createIRRCalculationService = (
  api: AxiosInstance, 
  options?: IRRCalculationOptions
): IRRCalculationService => {
  return new IRRCalculationService(api, options);
};

// Export singleton instance for use across the application
let irrCalculationServiceInstance: IRRCalculationService | null = null;

export const getIRRCalculationService = (api?: AxiosInstance): IRRCalculationService => {
  if (!irrCalculationServiceInstance) {
    if (!api) {
      throw new Error('API instance required for first call to getIRRCalculationService');
    }
    irrCalculationServiceInstance = new IRRCalculationService(api);
  }
  return irrCalculationServiceInstance;
};

export default IRRCalculationService; 