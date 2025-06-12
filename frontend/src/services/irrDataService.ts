import { AxiosInstance } from 'axios';
import { createValuationDataService, ValuationDataService } from './valuationDataService';

export interface FundIRR {
  fund_id: number;
  irr_result: number | null;
  irr_date: string;
}

export interface IRRCalculationParams {
  portfolioFundIds: number[];
  endDate?: string;
  startDate?: string;
}

export interface IRRDataSet {
  portfolioIRR: number | null;
  fundIRRs: FundIRR[];
  historicalIRR?: number | null;
  irrDate: string | null;
}

export interface ReportParams {
  portfolioId?: number;
  portfolioFundIds: number[];
  endDate?: string;
  includeHistorical?: boolean;
}

export class IRRDataService {
  private api: AxiosInstance;
  private valuationService: ValuationDataService;

  constructor(api: AxiosInstance) {
    this.api = api;
    this.valuationService = createValuationDataService(api);
  }

  /**
   * Fetch stored portfolio IRR from latest_portfolio_irr_values view
   */
  async getStoredPortfolioIRR(portfolioId: number): Promise<number | null> {
    try {
      console.log(`🔍 [IRR DEBUG] Fetching stored portfolio IRR for portfolio ${portfolioId}`);
      console.log(`🔍 [IRR DEBUG] API endpoint: /api/portfolios/${portfolioId}/latest-irr`);
      
      const response = await this.api.get(`/api/portfolios/${portfolioId}/latest-irr`);
      
      console.log(`🔍 [IRR DEBUG] Portfolio IRR API response:`, {
        status: response.status,
        data: response.data,
        hasData: !!response.data,
        irrResult: response.data?.irr_result,
        irrResultType: typeof response.data?.irr_result,
        irrDate: response.data?.irr_date
      });
      
      const irrResult = response.data?.irr_result || null;
      console.log(`🔍 [IRR DEBUG] Extracted IRR result: ${irrResult} (type: ${typeof irrResult})`);
      
      return irrResult;
    } catch (error: any) {
      console.error(`❌ [IRR DEBUG] Could not fetch stored IRR for portfolio ${portfolioId}:`, error);
      console.error(`❌ [IRR DEBUG] Error details:`, {
        message: error?.message,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        responseData: error?.response?.data
      });
      return null;
    }
  }

  /**
   * Fetch stored individual fund IRRs from latest_portfolio_fund_irr_values view
   */
  async getStoredFundIRRs(portfolioFundIds: number[]): Promise<FundIRR[]> {
    try {
      const response = await this.api.get('/api/portfolio-funds/latest-irr', {
        params: { fund_ids: portfolioFundIds.join(',') }
      });
      return response.data || [];
    } catch (error) {
      console.warn('Could not fetch stored fund IRRs:', error);
      return [];
    }
  }

  /**
   * Calculate IRR using the standardized multiple funds endpoint (only when needed)
   */
  async calculateHistoricalIRR(params: IRRCalculationParams): Promise<number | null> {
    try {
      console.log('Calculating IRR using standardized endpoint:', params);
      
      // Import the existing API function
      const { calculateStandardizedMultipleFundsIRR } = await import('./api');
      
      const response = await calculateStandardizedMultipleFundsIRR({
        portfolioFundIds: params.portfolioFundIds,
        irrDate: params.endDate
      });
      
      return response.data.irr_percentage;
    } catch (error) {
      console.error('Error calculating historical IRR:', error);
      return null;
    }
  }

  /**
   * Smart IRR fetcher - uses stored values when available, calculates only when needed
   */
  async getOptimizedIRRData(reportParams: ReportParams): Promise<IRRDataSet> {
    console.log(`🚀 [IRR DEBUG] Starting getOptimizedIRRData with params:`, reportParams);
    
    const { portfolioId, portfolioFundIds, endDate, includeHistorical } = reportParams;
    
    let portfolioIRR: number | null = null;
    let fundIRRs: FundIRR[] = [];
    let historicalIRR: number | null = null;
    let irrDate: string | null = null;

    // Strategy 1: Try to get stored portfolio IRR first (most efficient)
    console.log(`📋 [IRR DEBUG] Strategy 1: Checking for stored portfolio IRR`);
    if (portfolioId) {
      console.log(`📋 [IRR DEBUG] Portfolio ID provided: ${portfolioId}, fetching stored IRR...`);
      portfolioIRR = await this.getStoredPortfolioIRR(portfolioId);
      console.log(`📋 [IRR DEBUG] Stored portfolio IRR result: ${portfolioIRR}`);
      
      if (portfolioIRR !== null) {
        console.log(`✅ [IRR DEBUG] Using stored portfolio IRR: ${portfolioIRR}% for portfolio ${portfolioId}`);
        irrDate = 'latest'; // Could be enhanced to get actual date
      } else {
        console.log(`⚠️ [IRR DEBUG] No stored portfolio IRR found for portfolio ${portfolioId}`);
      }
    } else {
      console.log(`⚠️ [IRR DEBUG] No portfolio ID provided, skipping stored portfolio IRR lookup`);
    }

    // Strategy 2: Get stored fund IRRs if available
    if (portfolioFundIds.length > 0) {
      fundIRRs = await this.getStoredFundIRRs(portfolioFundIds);
      console.log(`Retrieved ${fundIRRs.length} stored fund IRRs`);
    }

    // Strategy 3: Calculate IRR only if:
    // - No stored portfolio IRR found, OR
    // - Historical comparison is requested, OR  
    // - Specific end date is provided (not using latest)
    const needsCalculation = portfolioIRR === null || includeHistorical || endDate;
    
    console.log(`📋 [IRR DEBUG] Strategy 3: Checking if IRR calculation is needed`);
    console.log(`📋 [IRR DEBUG] Calculation decision factors:`, {
      noStoredIRR: portfolioIRR === null,
      includeHistorical,
      hasEndDate: !!endDate,
      needsCalculation,
      portfolioFundIdsLength: portfolioFundIds.length
    });
    
    if (needsCalculation && portfolioFundIds.length > 0) {
      console.log(`🔄 [IRR DEBUG] Calculating IRR due to:`, {
        noStoredIRR: portfolioIRR === null,
        includeHistorical,
        hasEndDate: !!endDate
      });
      
      const calculatedIRR = await this.calculateHistoricalIRR({
        portfolioFundIds,
        endDate
      });
      
      console.log(`🔄 [IRR DEBUG] Calculated IRR result: ${calculatedIRR}`);
      
      if (portfolioIRR === null) {
        portfolioIRR = calculatedIRR;
        irrDate = endDate || 'calculated';
        console.log(`✅ [IRR DEBUG] Using calculated IRR as portfolio IRR: ${portfolioIRR}`);
      }
      
      if (includeHistorical) {
        historicalIRR = calculatedIRR;
        console.log(`✅ [IRR DEBUG] Set historical IRR: ${historicalIRR}`);
      }
    } else {
      console.log(`⏭️ [IRR DEBUG] Skipping IRR calculation - needsCalculation: ${needsCalculation}, fundIds length: ${portfolioFundIds.length}`);
    }

    const finalResult = {
      portfolioIRR,
      fundIRRs,
      historicalIRR,
      irrDate
    };
    
    console.log(`🎯 [IRR DEBUG] Final getOptimizedIRRData result:`, finalResult);
    
    return finalResult;
  }

  /**
   * Batch fetch IRR data for multiple portfolios/products
   */
  async getBatchIRRData(requests: ReportParams[]): Promise<IRRDataSet[]> {
    // Execute all IRR requests in parallel
    const results = await Promise.all(
      requests.map(params => this.getOptimizedIRRData(params))
    );
    
    console.log(`Processed ${requests.length} IRR requests in batch`);
    return results;
  }
}

// Singleton instance factory
export const createIRRDataService = (api: AxiosInstance): IRRDataService => {
  return new IRRDataService(api);
}; 