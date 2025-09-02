// Feature flags for gradual rollout and risk mitigation

export interface FeatureFlags {
  enableMiniYearSelectors: boolean;
  enableMiniYearSelectorsOnMobile: boolean;
  enableMiniYearSelectorsForAllUsers: boolean;
  debugMiniYearSelectors: boolean;
}

// Default feature flags - start with everything disabled for safety
const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enableMiniYearSelectors: true, // Enable for initial testing
  enableMiniYearSelectorsOnMobile: false, // Keep disabled on mobile initially
  enableMiniYearSelectorsForAllUsers: true, // Enable for all users initially
  debugMiniYearSelectors: false // Debug mode for development
};

// Environment-based overrides
const getEnvironmentFlags = (): Partial<FeatureFlags> => {
  const env = process.env.NODE_ENV;
  
  switch (env) {
    case 'development':
      return {
        enableMiniYearSelectors: true,
        enableMiniYearSelectorsOnMobile: true,
        enableMiniYearSelectorsForAllUsers: true,
        debugMiniYearSelectors: true
      };
    case 'test':
      return {
        enableMiniYearSelectors: true,
        enableMiniYearSelectorsOnMobile: true,
        enableMiniYearSelectorsForAllUsers: true,
        debugMiniYearSelectors: false
      };
    case 'production':
      return {
        enableMiniYearSelectors: true, // Start enabled in production
        enableMiniYearSelectorsOnMobile: false, // Conservative mobile approach
        enableMiniYearSelectorsForAllUsers: true,
        debugMiniYearSelectors: false
      };
    default:
      return {};
  }
};

// Runtime feature flag overrides (for emergency disable)
const getRuntimeFlags = (): Partial<FeatureFlags> => {
  // Check for emergency disable flag in localStorage
  const emergencyDisable = localStorage.getItem('EMERGENCY_DISABLE_MINI_YEAR_SELECTORS');
  if (emergencyDisable === 'true') {
    return {
      enableMiniYearSelectors: false,
      enableMiniYearSelectorsOnMobile: false,
      enableMiniYearSelectorsForAllUsers: false
    };
  }

  // Check for user-specific overrides
  const userOverrides = localStorage.getItem('MINI_YEAR_SELECTOR_OVERRIDES');
  if (userOverrides) {
    try {
      return JSON.parse(userOverrides);
    } catch (error) {
      console.warn('Failed to parse feature flag overrides:', error);
    }
  }

  return {};
};

// Device detection helper
const isMobileDevice = (): boolean => {
  return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Main feature flag getter
export const getFeatureFlags = (): FeatureFlags => {
  const baseFlags = DEFAULT_FEATURE_FLAGS;
  const envFlags = getEnvironmentFlags();
  const runtimeFlags = getRuntimeFlags();

  const mergedFlags = {
    ...baseFlags,
    ...envFlags,
    ...runtimeFlags
  };

  // Apply mobile-specific logic
  if (isMobileDevice() && !mergedFlags.enableMiniYearSelectorsOnMobile) {
    mergedFlags.enableMiniYearSelectors = false;
  }

  return mergedFlags;
};

// Hook for React components
export const useFeatureFlags = (): FeatureFlags => {
  return getFeatureFlags();
};

// Utility functions for specific feature checks
export const shouldShowMiniYearSelectors = (): boolean => {
  const flags = getFeatureFlags();
  return flags.enableMiniYearSelectors && flags.enableMiniYearSelectorsForAllUsers;
};

// Emergency disable function
export const emergencyDisableMiniYearSelectors = (): void => {
  localStorage.setItem('EMERGENCY_DISABLE_MINI_YEAR_SELECTORS', 'true');
  console.warn('Mini year selectors have been emergency disabled. Please refresh the page.');
};

// Debug logging
export const logFeatureFlagUsage = (featureName: string, enabled: boolean): void => {
  const flags = getFeatureFlags();
  if (flags.debugMiniYearSelectors) {
    console.log(`[FeatureFlag] ${featureName}: ${enabled ? 'ENABLED' : 'DISABLED'}`, {
      flags,
      isMobile: isMobileDevice(),
      userAgent: navigator.userAgent
    });
  }
};

// Performance monitoring helper
export const trackFeaturePerformance = (featureName: string, startTime: number): void => {
  const flags = getFeatureFlags();
  if (flags.debugMiniYearSelectors) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(`[FeatureFlag Performance] ${featureName}: ${duration.toFixed(2)}ms`);
    
    // Alert if performance is poor
    if (duration > 50) {
      console.warn(`[FeatureFlag Performance] ${featureName} took ${duration.toFixed(2)}ms - consider optimization`);
    }
  }
};