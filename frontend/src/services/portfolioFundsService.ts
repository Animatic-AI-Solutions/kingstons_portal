export interface PortfolioFund {
  id: number;
  portfolio_id: number;
  available_funds_id: number;
  market_value?: number;
  fund_name?: string;
  status?: string;
  end_date?: string;
  target_weighting?: number;
  start_date?: string;
  amount_invested?: number;
}

export class PortfolioFundsService {
  private api: any;
  private cache = new Map<number, PortfolioFund[]>();
  private pendingRequests = new Map<number, Promise<PortfolioFund[]>>();

  constructor(api: any) {
    this.api = api;
  }

  /**
   * Get portfolio funds for multiple portfolios in a single batch request
   */
  async getBatchPortfolioFunds(portfolioIds: number[]): Promise<Map<number, PortfolioFund[]>> {
    const results = new Map<number, PortfolioFund[]>();
    const uncachedIds: number[] = [];

    // Check cache first
    for (const portfolioId of portfolioIds) {
      if (this.cache.has(portfolioId)) {
        results.set(portfolioId, this.cache.get(portfolioId)!);
      } else {
        uncachedIds.push(portfolioId);
      }
    }

    if (uncachedIds.length === 0) {
      return results;
    }

    try {
      // Use the batch endpoint if available, otherwise fall back to individual calls
      if (uncachedIds.length === 1) {
        // Single request
        const portfolioId = uncachedIds[0];
        
        // Validate portfolio_id to prevent null/undefined being passed to API
        if (portfolioId === null || portfolioId === undefined || isNaN(portfolioId)) {
          console.warn(`Invalid portfolio_id in batch: ${portfolioId}, skipping`);
          results.set(portfolioId, []);
        } else {
          const response = await this.api.get(`/portfolio-funds?portfolio_id=${portfolioId}`);
          const portfolioFunds = response.data || [];
          
          this.cache.set(portfolioId, portfolioFunds);
          results.set(portfolioId, portfolioFunds);
        }
      } else {
        // Multiple requests - batch them efficiently using Promise.all
        const requests = uncachedIds.map(async (portfolioId) => {
          // Check if there's already a pending request for this portfolio
          if (this.pendingRequests.has(portfolioId)) {
            return { portfolioId, data: await this.pendingRequests.get(portfolioId)! };
          }

          // Create and cache the promise
          const promise = this.fetchSinglePortfolioFunds(portfolioId);
          this.pendingRequests.set(portfolioId, promise);
          
          try {
            const data = await promise;
            return { portfolioId, data };
          } finally {
            // Clean up the pending request
            this.pendingRequests.delete(portfolioId);
          }
        });

        const responses = await Promise.all(requests);
        
        for (const { portfolioId, data } of responses) {
          this.cache.set(portfolioId, data);
          results.set(portfolioId, data);
        }
      }
    } catch (error) {
      console.error('Error fetching batch portfolio funds:', error);
      // Return cached results if available, empty arrays for failed requests
      for (const portfolioId of uncachedIds) {
        if (!results.has(portfolioId)) {
          results.set(portfolioId, []);
        }
      }
    }

    return results;
  }

  /**
   * Get portfolio funds for a single portfolio
   */
  async getPortfolioFunds(portfolioId: number): Promise<PortfolioFund[]> {
    const batchResult = await this.getBatchPortfolioFunds([portfolioId]);
    return batchResult.get(portfolioId) || [];
  }

  /**
   * Fetch single portfolio funds (internal method)
   */
  private async fetchSinglePortfolioFunds(portfolioId: number): Promise<PortfolioFund[]> {
    // Validate portfolio_id to prevent null/undefined being passed to API
    if (portfolioId === null || portfolioId === undefined || isNaN(portfolioId)) {
      console.warn(`Invalid portfolio_id: ${portfolioId}, returning empty array`);
      return [];
    }
    
    const response = await this.api.get(`/portfolio-funds?portfolio_id=${portfolioId}`);
    return response.data || [];
  }

  /**
   * Clear cache for specific portfolio or all
   */
  clearCache(portfolioId?: number): void {
    if (portfolioId) {
      this.cache.delete(portfolioId);
    } else {
      this.cache.clear();
    }
  }
}

export const createPortfolioFundsService = (api: any) => new PortfolioFundsService(api); 