import { AxiosInstance } from 'axios';

export interface FundValuation {
  portfolio_fund_id: number;
  valuation: number;
  valuation_date: string | null;
}

export interface BatchValuationResponse {
  fund_valuations: Record<number, {
    valuation: number;
    valuation_date: string | null;
  }>;
  count: number;
  requested_funds: number;
  source: string;
}

export class ValuationDataService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  /**
   * Batch fetch fund valuations for multiple funds in a single request
   * This eliminates the N+1 query problem where individual valuation requests are made per fund
   */
  async getBatchFundValuations(
    fundIds: number[], 
    valuationDate?: string
  ): Promise<BatchValuationResponse> {
    try {
      if (fundIds.length === 0) {
        return {
          fund_valuations: {},
          count: 0,
          requested_funds: 0,
          source: 'empty_request'
        };
      }

      console.log(`🚀 Batch fetching valuations for ${fundIds.length} funds (eliminates ${fundIds.length} individual requests)`);

      const response = await this.api.post('/portfolio-funds/batch-valuations', {
        fund_ids: fundIds,
        valuation_date: valuationDate
      });

      console.log(`✅ Batch valuation fetch complete: ${response.data.count} funds processed`);
      
      return response.data;
    } catch (error) {
      console.error('Error in batch fund valuations:', error);
      // Return empty response rather than throwing to maintain graceful degradation
      return {
        fund_valuations: {},
        count: 0,
        requested_funds: fundIds.length,
        source: 'error'
      };
    }
  }

  /**
   * Get valuations for a single portfolio's funds
   */
  async getPortfolioFundValuations(
    portfolioId: number, 
    valuationDate?: string
  ): Promise<BatchValuationResponse> {
    try {
      // First get all fund IDs for the portfolio
      const portfolioFundsResponse = await this.api.get('/portfolio_funds', {
        params: { portfolio_id: portfolioId }
      });

      const fundIds = portfolioFundsResponse.data.map((fund: any) => fund.id);
      
      if (fundIds.length === 0) {
        return {
          fund_valuations: {},
          count: 0,
          requested_funds: 0,
          source: 'no_funds'
        };
      }

      // Batch fetch valuations for all funds
      return await this.getBatchFundValuations(fundIds, valuationDate);
    } catch (error) {
      console.error(`Error fetching valuations for portfolio ${portfolioId}:`, error);
      return {
        fund_valuations: {},
        count: 0,
        requested_funds: 0,
        source: 'error'
      };
    }
  }

  /**
   * Convert batch response to simple valuation map for easy access
   */
  static toValuationMap(batchResponse: BatchValuationResponse): Record<number, number> {
    const valuationMap: Record<number, number> = {};
    
    for (const [fundId, valuationData] of Object.entries(batchResponse.fund_valuations)) {
      valuationMap[parseInt(fundId)] = valuationData.valuation;
    }
    
    return valuationMap;
  }

  /**
   * Get latest valuation dates for performance tracking
   */
  async getLatestValuationDates(fundIds: number[]): Promise<string[]> {
    try {
      const batchResponse = await this.getBatchFundValuations(fundIds);
      
      const dates = Object.values(batchResponse.fund_valuations)
        .map(valuation => valuation.valuation_date)
        .filter((date): date is string => date !== null)
        .sort((a, b) => b.localeCompare(a)); // Sort descending
      
      return [...new Set(dates)]; // Remove duplicates
    } catch (error) {
      console.error('Error fetching latest valuation dates:', error);
      return [];
    }
  }

  /**
   * Get all historical valuations for multiple funds (for date filtering)
   * Returns Map<fundId, valuation[]> like the old individual requests
   */
  async getBatchHistoricalValuations(fundIds: number[]): Promise<Map<number, any[]>> {
    try {
      if (fundIds.length === 0) {
        return new Map();
      }

      console.log(`🚀 Batch fetching ALL historical valuations for ${fundIds.length} funds (eliminates ${fundIds.length} individual requests)`);

      // Use the new batch historical endpoint
      const response = await this.api.post('/portfolio-funds/batch-historical-valuations', {
        fund_ids: fundIds
      });

      const resultMap = new Map<number, any[]>();

      // Process the batch response
      if (response.data && response.data.fund_historical_valuations) {
        const historicalData = response.data.fund_historical_valuations;
        
        for (const [fundIdStr, valuations] of Object.entries(historicalData)) {
          const fundId = parseInt(fundIdStr);
          resultMap.set(fundId, valuations as any[]);
        }
      }

      console.log(`✅ Batch historical valuation fetch complete: ${response.data?.total_valuations || 0} total valuations for ${fundIds.length} funds`);
      return resultMap;
    } catch (error) {
      console.error('Error in batch historical valuations:', error);
      
      // Graceful fallback to individual requests if batch fails
      console.log(`⚠️ Falling back to individual requests for ${fundIds.length} funds`);
      
      const requests = fundIds.map(async (fundId) => {
        try {
          const response = await this.api.get(`/fund_valuations`, { 
            params: { portfolio_fund_id: fundId, limit: 500 } 
          });
          return { fundId, data: response.data || [] };
        } catch (err) {
          console.error(`Failed to fetch valuations for fund ${fundId}:`, err);
          return { fundId, data: [] };
        }
      });

      const responses = await Promise.all(requests);
      const resultMap = new Map<number, any[]>();

      responses.forEach(({ fundId, data }) => {
        resultMap.set(fundId, data);
      });

      return resultMap;
    }
  }
}

// Singleton factory
export const createValuationDataService = (api: AxiosInstance): ValuationDataService => {
  return new ValuationDataService(api);
}; 