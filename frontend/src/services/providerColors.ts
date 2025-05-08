import { getProviderThemeColors, initializeProviderThemeColors } from './api';

/**
 * ProviderColorsService
 * 
 * A service to manage provider theme colors throughout the application.
 * - Fetches colors from the backend
 * - Caches them for efficient access
 * - Provides fallback colors when needed
 */

// Types
interface ProviderColor {
  id: number;
  name: string;
  theme_color: string | null;
}

// In-memory cache for provider colors
let colorCache: Record<number, string> = {};
let nameColorCache: Record<string, string> = {};
let isInitialized = false;

// Fallback colors if provider has no theme color
const fallbackColors = [
  '#1E40AF', // Deep Blue
  '#15803D', // Forest Green
  '#B91C1C', // Rich Red
  '#7E22CE', // Vibrant Purple
  '#C2410C', // Burnt Orange
  '#0F766E', // Deep Teal
  '#BE185D', // Hot Pink
  '#B45309', // Golden Brown
  '#3730A3', // Royal Indigo
  '#047857', // Emerald
  '#9F1239', // Crimson
  '#0E7490', // Deep Cyan
  '#6D28D9', // Violet
  '#92400E', // Amber
  '#334155', // Dark Slate
];

/**
 * Initializes the color service by fetching colors from the API
 * @param {boolean} initMissingColors - Whether to initialize missing colors on the server
 * @returns {Promise<void>}
 */
export const initializeColorService = async (initMissingColors = false): Promise<void> => {
  try {
    // First check if there are any missing colors that need to be initialized
    if (initMissingColors) {
      try {
        await initializeProviderThemeColors();
      } catch (initError) {
        console.warn('Failed to initialize missing provider colors, continuing with existing colors', initError);
        // Continue execution - don't let this error stop us from fetching existing colors
      }
    }
    
    // Then fetch all provider colors
    try {
      const response = await getProviderThemeColors();
      const providers: ProviderColor[] = response.data;
      
      // Store in cache by ID and name
      providers.forEach(provider => {
        if (provider.theme_color) {
          colorCache[provider.id] = provider.theme_color;
          if (provider.name) {
            nameColorCache[provider.name] = provider.theme_color;
          }
        }
      });
      
      console.log('Provider color service initialized', { 
        providersLoaded: providers.length,
        colorsInCache: Object.keys(colorCache).length
      });
      
      isInitialized = true;
    } catch (fetchError) {
      console.error('Failed to fetch provider colors from API', fetchError);
      // Continue with empty cache - we'll use fallback colors
      isInitialized = true; // Set as initialized to prevent repeated failing requests
    }
  } catch (error) {
    console.error('Failed to initialize provider color service', error);
    // Set as initialized anyway to prevent repeated failing requests
    isInitialized = true;
  }
};

/**
 * Gets a provider's color by ID
 * @param {number} providerId - The provider ID
 * @returns {string} The provider's color or a fallback
 */
export const getProviderColorById = (providerId: number | null | undefined): string => {
  if (!providerId) return '#CCCCCC'; // Default gray for unknown providers
  
  // Return cached color if available
  if (colorCache[providerId]) {
    return colorCache[providerId];
  }
  
  // Fallback to deterministic color based on ID
  return fallbackColors[providerId % fallbackColors.length];
};

/**
 * Gets a provider's color by name
 * @param {string} providerName - The provider name
 * @returns {string} The provider's color or a fallback
 */
export const getProviderColorByName = (providerName: string | null | undefined): string => {
  if (!providerName) return '#CCCCCC'; // Default gray for unknown providers
  
  // Return cached color if available
  if (nameColorCache[providerName]) {
    return nameColorCache[providerName];
  }
  
  // Fallback to deterministic color based on name hash
  const hash = providerName.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const index = Math.abs(hash) % fallbackColors.length;
  return fallbackColors[index];
};

/**
 * Gets a provider's color by either ID or name, preferring ID if both are provided
 * @param {number} providerId - The provider ID
 * @param {string} providerName - The provider name
 * @param {string} explicitColor - Optional explicit color to use
 * @returns {string} The provider's color
 */
export const getProviderColor = (
  providerId?: number | null, 
  providerName?: string | null,
  explicitColor?: string | null
): string => {
  // If an explicit color is provided, use it
  if (explicitColor) {
    return explicitColor;
  }
  
  // Try to get color by ID first
  if (providerId) {
    return getProviderColorById(providerId);
  }
  
  // Fall back to name lookup
  if (providerName) {
    return getProviderColorByName(providerName);
  }
  
  // Default if nothing is provided
  return '#CCCCCC';
};

// Initialize the service when imported
if (!isInitialized) {
  // Initialize in the background
  initializeColorService().catch(err => 
    console.error('Background initialization of provider colors failed', err)
  );
}

export default {
  initializeColorService,
  getProviderColor,
  getProviderColorById,
  getProviderColorByName
}; 