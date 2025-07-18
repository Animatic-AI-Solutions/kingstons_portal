import api from './api';

export interface ActivityEdit {
  id?: number;
  fundId: number;
  month: string;
  activityType: string;
  value: string;
  isNew: boolean;
  originalActivityId?: number;
  toDelete?: boolean;
}

export interface ValuationEdit {
  id?: number;
  fundId: number;
  month: string;
  value: string;
  isNew: boolean;
  originalActivityId?: number;
  toDelete?: boolean;
}

export interface TransactionResult {
  success: boolean;
  errors: string[];
  processedActivities: number;
  processedValuations: number;
  recalculatedIRRs: number;
}

/**
 * Transaction Coordinator Service
 * Ensures activities are saved before valuations to prevent IRR calculation race conditions
 * Phase 3: Triggers IRR recalculation after all saves are complete
 */
export class TransactionCoordinator {
  
  /**
   * Save activities and valuations in correct order with IRR recalculation
   * Activities MUST be saved before valuations to ensure IRR calculations have complete data
   */
  static async saveActivitiesAndValuations(
    edits: ActivityEdit[],
    accountHoldingId: number
  ): Promise<TransactionResult> {
    
    const result: TransactionResult = {
      success: true,
      errors: [],
      processedActivities: 0,
      processedValuations: 0,
      recalculatedIRRs: 0
    };

    try {
      // Separate activities and valuations
      const activities = edits.filter(edit => edit.activityType !== 'Current Value');
      const valuations = edits.filter(edit => edit.activityType === 'Current Value');

      console.log(`🔄 Transaction Coordinator: Processing ${activities.length} activities and ${valuations.length} valuations`);

      // PHASE 1: Save all activities first
      if (activities.length > 0) {
        console.log('📥 Phase 1: Saving activities...');
        
        for (const activity of activities) {
          await this.saveActivity(activity, accountHoldingId);
          result.processedActivities++;
        }
        
        console.log(`✅ Phase 1 Complete: ${result.processedActivities} activities saved`);
      }

      // PHASE 2: Save valuations after all activities are saved
      if (valuations.length > 0) {
        console.log('💰 Phase 2: Saving valuations...');
        
        for (const valuation of valuations) {
          await this.saveValuation(valuation);
          result.processedValuations++;
        }
        
        console.log(`✅ Phase 2 Complete: ${result.processedValuations} valuations saved`);
      }

      // PHASE 3: Trigger IRR recalculation for affected portfolio funds
      if (activities.length > 0) {
        console.log('🔄 Phase 3: Triggering IRR recalculation for activity changes...');
        
        // Group activities by fund and month to trigger recalculation
        const fundActivityMap = new Map<number, string[]>();
        
        activities.forEach(activity => {
          if (!activity.toDelete) { // Only for non-deleted activities
            const fundId = activity.fundId;
            const activityDate = `${activity.month}-01`;
            
            if (!fundActivityMap.has(fundId)) {
              fundActivityMap.set(fundId, []);
            }
            fundActivityMap.get(fundId)!.push(activityDate);
          }
        });

        // Trigger recalculation for each affected fund
        for (const [fundId, dates] of fundActivityMap) {
          try {
            // Get the earliest activity date for this fund to trigger recalculation
            const earliestDate = dates.sort()[0];
            
            console.log(`🔄 Triggering IRR recalculation for fund ${fundId} from date ${earliestDate}`);
            
            const recalcResponse = await api.post(`portfolio_funds/${fundId}/recalculate-irr`, {
              activity_date: earliestDate
            });
            
            if (recalcResponse.data?.recalculation_result?.recalculated_existing) {
              const recalculatedCount = recalcResponse.data.recalculation_result.recalculated_existing;
              result.recalculatedIRRs += recalculatedCount;
              console.log(`✅ Recalculated ${recalculatedCount} IRR values for fund ${fundId}`);
            } else {
              console.log(`✅ IRR recalculation triggered for fund ${fundId} (no existing IRRs to recalculate)`);
            }
            
          } catch (error: any) {
            console.warn(`⚠️ IRR recalculation failed for fund ${fundId}:`, error.message);
            // Don't fail the entire transaction for IRR recalculation issues
          }
        }
        
        console.log(`✅ Phase 3 Complete: ${result.recalculatedIRRs} IRR values recalculated`);
      }

      console.log('🎉 Transaction Coordinator: All saves completed successfully');
      
    } catch (error: any) {
      console.error('❌ Transaction Coordinator Error:', error);
      result.success = false;
      result.errors.push(error.message || 'Unknown error occurred');
    }

    return result;
  }

  /**
   * Save a single activity
   */
  private static async saveActivity(activity: ActivityEdit, accountHoldingId: number): Promise<void> {
    const backendActivityType = this.convertActivityTypeForBackend(activity.activityType);
    
    const activityData = {
      portfolio_fund_id: activity.fundId,
      product_id: accountHoldingId,
      activity_type: backendActivityType,
      activity_timestamp: `${activity.month}-01`,
      amount: activity.value
    };

    console.log(`📥 Saving activity: ${JSON.stringify(activityData)}`);

    if (activity.toDelete && activity.originalActivityId) {
      await api.delete(`holding_activity_logs/${activity.originalActivityId}`);
    } else if (activity.isNew) {
      // Skip IRR calculation for new activities - it will be calculated after valuation
      await api.post('holding_activity_logs', activityData, { 
        params: { skip_irr_calculation: true } 
      });
    } else if (activity.originalActivityId) {
      await api.patch(`holding_activity_logs/${activity.originalActivityId}`, activityData);
    }
  }

  /**
   * Save a single valuation
   */
  private static async saveValuation(valuation: ValuationEdit): Promise<void> {
    const valuationData = {
      portfolio_fund_id: valuation.fundId,
      valuation_date: `${valuation.month}-01`,
      valuation: parseFloat(valuation.value)
    };

    console.log(`💰 Saving valuation: ${JSON.stringify(valuationData)}`);

    if (valuation.toDelete && valuation.originalActivityId) {
      await api.delete(`fund_valuations/${valuation.originalActivityId}`);
    } else if (valuation.isNew) {
      await api.post('fund_valuations', valuationData);
    } else if (valuation.originalActivityId) {
      await api.patch(`fund_valuations/${valuation.originalActivityId}`, valuationData);
    }
  }

  /**
   * Convert UI activity type to backend format
   */
  private static convertActivityTypeForBackend(activityType: string): string {
    const typeMap: { [key: string]: string } = {
      'Investment': 'Investment',
      'Withdrawal': 'Withdrawal',
      'Switch In': 'Switch In',
      'Switch Out': 'Switch Out',
      'Fee': 'Fee',
      'Interest': 'Interest',
      'Dividend': 'Dividend',
      'Capital Gain': 'Capital Gain',
      'Capital Loss': 'Capital Loss',
      'Other': 'Other'
    };
    
    return typeMap[activityType] || activityType;
  }

  /**
   * Group edits by month and fund for batch processing
   */
  static groupEditsByMonthAndFund(edits: ActivityEdit[]): Map<string, ActivityEdit[]> {
    const groups = new Map<string, ActivityEdit[]>();
    
    for (const edit of edits) {
      const key = `${edit.month}_${edit.fundId}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(edit);
    }
    
    return groups;
  }
} 