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

      // VALIDATION: Check activities before processing to prevent sequence waste
      if (activities.length > 0) {
        const validationErrors = this.validateBulkActivities(activities);
        if (validationErrors.length > 0) {
          throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
        }
        console.log(`✅ Validation passed for ${activities.length} activities`);
      }

      // PHASE 1: Save all activities first (using bulk operations where possible)
      if (activities.length > 0) {
        console.log('📥 Phase 1: Saving activities in bulk...');
        
        await this.saveBulkActivities(activities, accountHoldingId);
        result.processedActivities = activities.length;
        
        console.log(`✅ Phase 1 Complete: ${result.processedActivities} activities saved in bulk`);
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
      console.log('🔄 Phase 3: Triggering IRR recalculation...');
      
      // Group activities by fund and month to trigger recalculation
      const fundRecalculationMap = new Map<number, string[]>();
      
      // Process activities
      if (activities.length > 0) {
        console.log('🔄 Phase 3a: Processing activity-based IRR recalculation...');
        
        activities.forEach(activity => {
          if (!activity.toDelete) { // Only for non-deleted activities
            const fundId = activity.fundId;
            const activityDate = `${activity.month}-01`;
            
            if (!fundRecalculationMap.has(fundId)) {
              fundRecalculationMap.set(fundId, []);
            }
            fundRecalculationMap.get(fundId)!.push(activityDate);
          }
        });
      }
      
      // Process valuations - NEW: Also trigger IRR recalculation for valuation changes
      if (valuations.length > 0) {
        console.log('🔄 Phase 3b: Processing valuation-based IRR recalculation...');
        
        valuations.forEach(valuation => {
          if (!valuation.toDelete) { // Only for non-deleted valuations
            const fundId = valuation.fundId;
            const valuationDate = `${valuation.month}-01`;
            
            if (!fundRecalculationMap.has(fundId)) {
              fundRecalculationMap.set(fundId, []);
            }
            fundRecalculationMap.get(fundId)!.push(valuationDate);
            
            console.log(`📊 Valuation change detected for fund ${fundId} on ${valuationDate} - will trigger IRR recalculation`);
          }
        });
      }

      // Trigger recalculation for each affected fund (both activities and valuations)
      if (fundRecalculationMap.size > 0) {
        for (const [fundId, dates] of fundRecalculationMap) {
          try {
            // Get the earliest date for this fund to trigger recalculation
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
        
        console.log(`✅ Phase 3 Complete: ${result.recalculatedIRRs} IRR values recalculated across ${fundRecalculationMap.size} funds`);
      } else {
        console.log('✅ Phase 3 Complete: No IRR recalculation needed (no non-deleted activities or valuations)');
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
   * Save activities in bulk using sequence reservation
   * This replaces individual API calls with a single bulk operation for new activities
   */
  private static async saveBulkActivities(
    activities: ActivityEdit[], 
    accountHoldingId: number
  ): Promise<void> {
    
    if (activities.length === 0) return;
    
    console.log(`🚀 BULK: Saving ${activities.length} activities with sequence reservation`);
    
    // Separate activities by operation type
    const newActivities = activities.filter(activity => activity.isNew && !activity.toDelete);
    const updateActivities = activities.filter(activity => !activity.isNew && !activity.toDelete && activity.originalActivityId);
    const deleteActivities = activities.filter(activity => activity.toDelete && activity.originalActivityId);
    
    // Handle bulk creation for new activities
    if (newActivities.length > 0) {
      console.log(`📥 BULK: Creating ${newActivities.length} new activities...`);
      
      // Convert to backend format
      const activityData = newActivities.map(activity => ({
        portfolio_fund_id: activity.fundId,
        product_id: accountHoldingId,
        activity_type: this.convertActivityTypeForBackend(activity.activityType),
        activity_timestamp: `${activity.month}-01`,
        amount: parseFloat(activity.value)
      }));

      // Use bulk endpoint with sequence reservation
      const response = await api.post('holding_activity_logs/bulk', activityData, {
        params: { skip_irr_calculation: true }
      });
      
      console.log(`✅ BULK: Successfully created ${response.data.length} activities`);
    }
    
    // Handle individual updates (can't be bulked due to different IDs)
    if (updateActivities.length > 0) {
      console.log(`🔄 BULK: Updating ${updateActivities.length} existing activities individually...`);
      for (const activity of updateActivities) {
        await this.saveActivity(activity, accountHoldingId);
      }
    }
    
    // Handle individual deletions (can't be bulked due to different IDs)
    if (deleteActivities.length > 0) {
      console.log(`🗑️ BULK: Deleting ${deleteActivities.length} activities individually...`);
      for (const activity of deleteActivities) {
        await this.saveActivity(activity, accountHoldingId);
      }
    }
  }

  /**
   * Validate activities before bulk save to prevent sequence reservation waste
   */
  private static validateBulkActivities(activities: ActivityEdit[]): string[] {
    const errors: string[] = [];
    
    activities.forEach((activity, index) => {
      const activityNum = index + 1;
      
      if (!activity.fundId) {
        errors.push(`Activity ${activityNum}: Missing fund ID`);
      }
      
      if (!activity.activityType) {
        errors.push(`Activity ${activityNum}: Missing activity type`);
      }
      
      if (!activity.value || isNaN(parseFloat(activity.value))) {
        errors.push(`Activity ${activityNum}: Invalid amount value: ${activity.value}`);
      }
      
      if (!activity.month || !/^\d{4}-\d{2}$/.test(activity.month)) {
        errors.push(`Activity ${activityNum}: Invalid month format (expected YYYY-MM): ${activity.month}`);
      }
    });
    
    return errors;
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