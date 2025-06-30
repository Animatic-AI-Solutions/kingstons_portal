import { AxiosInstance } from 'axios';
import { IRRDataService, createIRRDataService } from './irrDataService';
import { 
  Product, 
  ProductPeriodSummary, 
  PortfolioFund,
  ReportData,
  ReportFilters 
} from '../components/reports/shared/ReportTypes';

export interface CompleteReportData {
  products: Product[];
  productSummaries: ProductPeriodSummary[];
  totalValuation: number;
  totalIRR: number | null;
  valuationDate: string | null;
  earliestTransactionDate: string | null;
}

export interface ReportDataParams {
  filters: ReportFilters;
  uniqueProductIds: number[];
  selectedValuationDate: string | null;
}

export class ReportDataService {
  private api: AxiosInstance;
  private irrService: IRRDataService;

  constructor(api: AxiosInstance) {
    this.api = api;
    this.irrService = createIRRDataService(api);
  }

  /**
   * Single API call to get all report data - eliminates multiple redundant requests
   */
  async getReportData(params: ReportDataParams): Promise<CompleteReportData> {
    const { uniqueProductIds, selectedValuationDate } = params;
    
    console.log('🚀 Batch fetching report data for products:', uniqueProductIds);
    
    // Batch fetch all required data in parallel (Phase 3: API Call Optimization)
    const [
      productsData,
      portfolioFundsData,
      irrDataResults
    ] = await Promise.all([
      this.getProductData(uniqueProductIds),
      this.getPortfolioFundsData(uniqueProductIds),
      this.getBatchIRRData(uniqueProductIds, selectedValuationDate)
    ]);

    // Combine and process the data
    const reportData = await this.combineReportData(
      productsData,
      portfolioFundsData,
      irrDataResults,
      selectedValuationDate
    );

    console.log('✅ Report data batch fetch complete:', {
      products: reportData.productSummaries.length,
      totalValue: reportData.totalValuation,
      totalIRR: reportData.totalIRR
    });

    return reportData;
  }

  /**
   * Fetch product data for multiple products in a single request
   */
  private async getProductData(productIds: number[]): Promise<Product[]> {
    if (productIds.length === 0) return [];
    
    try {
      // Use a single query with IN clause instead of multiple individual requests
      const response = await this.api.get('/client_products', {
        params: { 
          ids: productIds.join(','),
          include_provider: true,
          limit: 1000 // Ensure we get all products
        }
      });
      
      return response.data.filter((product: Product) => 
        productIds.includes(product.id)
      );
    } catch (error) {
      console.error('Error fetching product data:', error);
      return [];
    }
  }

  /**
   * Fetch portfolio funds data for multiple portfolios
   */
  private async getPortfolioFundsData(productIds: number[]): Promise<Map<number, PortfolioFund[]>> {
    const portfolioFundsMap = new Map<number, PortfolioFund[]>();
    
    if (productIds.length === 0) return portfolioFundsMap;

    try {
      // Get all portfolios for the products first
      const productsResponse = await this.api.get('/client_products', {
        params: { ids: productIds.join(',') }
      });
      
      const portfolioIds = [...new Set(
        productsResponse.data
          .map((p: Product) => p.portfolio_id)
          .filter((id: number) => id)
      )];

      if (portfolioIds.length === 0) return portfolioFundsMap;

      // Batch fetch portfolio funds for all portfolios
      const fundsResponse = await this.api.get('/portfolio_funds', {
        params: {
          portfolio_ids: portfolioIds.join(','),
          limit: 10000
        }
      });

      // Group funds by product ID
      const portfolioToProduct = new Map<number, number>();
      productsResponse.data.forEach((product: Product) => {
        if (product.portfolio_id) {
          portfolioToProduct.set(product.portfolio_id, product.id);
        }
      });

      fundsResponse.data.forEach((fund: PortfolioFund) => {
        const productId = portfolioToProduct.get(fund.portfolio_id);
        if (productId) {
          if (!portfolioFundsMap.has(productId)) {
            portfolioFundsMap.set(productId, []);
          }
          portfolioFundsMap.get(productId)!.push(fund);
        }
      });

      return portfolioFundsMap;
    } catch (error) {
      console.error('Error fetching portfolio funds data:', error);
      return portfolioFundsMap;
    }
  }

  /**
   * Get optimized IRR data using the IRRDataService
   */
  private async getBatchIRRData(productIds: number[], selectedValuationDate: string | null): Promise<Map<number, any>> {
    const irrMap = new Map<number, any>();
    
    if (productIds.length === 0) return irrMap;

    try {
      // Prepare IRR requests for batch processing
      const irrRequests = await Promise.all(
        productIds.map(async (productId) => {
          // Get portfolio info for the product
          const productResponse = await this.api.get(`/client_products/${productId}`);
          const portfolioId = productResponse.data?.portfolio_id;
          
          if (!portfolioId) return null;

          // Get portfolio fund IDs
          const fundsResponse = await this.api.get('/portfolio_funds', {
            params: { portfolio_id: portfolioId }
          });
          
          const portfolioFundIds = fundsResponse.data.map((f: PortfolioFund) => f.id);

          return {
            productId,
            portfolioId,
            portfolioFundIds,
            endDate: selectedValuationDate,
            includeHistorical: false
          };
        })
      );

      // Filter out null requests and batch process IRR data
      const validRequests = irrRequests.filter((req): req is NonNullable<typeof req> => req !== null);
      const irrResults = await this.irrService.getBatchIRRData(
        validRequests.map(req => ({
          portfolioId: req.portfolioId,
          portfolioFundIds: req.portfolioFundIds,
          endDate: req.endDate || undefined,
          includeHistorical: req.includeHistorical
        }))
      );

      // Map results back to product IDs
      validRequests.forEach((request, index) => {
        if (request && irrResults[index]) {
          irrMap.set(request.productId, irrResults[index]);
        }
      });

      return irrMap;
    } catch (error) {
      console.error('Error fetching batch IRR data:', error);
      return irrMap;
    }
  }

  /**
   * Combine all fetched data into the final report format
   */
  private async combineReportData(
    products: Product[],
    portfolioFundsMap: Map<number, PortfolioFund[]>,
    irrDataMap: Map<number, any>,
    selectedValuationDate: string | null
  ): Promise<CompleteReportData> {
    const productSummaries: ProductPeriodSummary[] = [];
    let totalValuation = 0;
    let overallIRRData: any[] = [];

    for (const product of products) {
      const portfolioFunds = portfolioFundsMap.get(product.id) || [];
      const irrData = irrDataMap.get(product.id);

      // Calculate product valuation and summary
      const productValuation = portfolioFunds.reduce(
        (sum, fund) => sum + (fund.market_value || 0), 0
      );

      const productSummary: ProductPeriodSummary = {
        id: product.id,
        product_name: product.product_name,
        start_date: null, // Would need to fetch from activity logs
        total_investment: 0, // Would need to calculate from activities
        total_withdrawal: 0,
        total_fund_switch_in: 0,
        total_fund_switch_out: 0,
        net_flow: 0,
        current_valuation: productValuation,
        irr: irrData?.portfolioIRR || null,
        provider_name: product.provider_name,
        provider_theme_color: product.provider_theme_color,
        funds: [] // Could be populated if needed
      };

      productSummaries.push(productSummary);
      totalValuation += productValuation;

      if (irrData?.portfolioIRR !== null) {
        overallIRRData.push(irrData.portfolioIRR);
      }
    }

    // Calculate overall IRR (simplified - could use weighted average)
    const totalIRR = overallIRRData.length > 0
      ? overallIRRData.reduce((sum, irr) => sum + irr, 0) / overallIRRData.length
      : null;

    return {
      products,
      productSummaries,
      totalValuation,
      totalIRR,
      valuationDate: selectedValuationDate,
      earliestTransactionDate: null // Would need additional calculation
    };
  }
}

// Singleton factory
export const createReportDataService = (api: AxiosInstance): ReportDataService => {
  return new ReportDataService(api);
}; 