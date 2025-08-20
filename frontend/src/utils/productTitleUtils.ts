import type { ProductPeriodSummary } from '../types/reportTypes';

/**
 * Extract plan number from product
 */
export const extractPlanNumber = (product: ProductPeriodSummary): string | null => {
  // First, check if plan_number field exists
  if (product.plan_number) {
    return product.plan_number;
  }
  
  // Fallback: try to extract from product_name if it contains plan-like patterns
  if (product.product_name) {
    const patterns = [
      /Plan Number[:\s]*([A-Z0-9\-\/]+)/i,
      /Plan[:\s]*([A-Z0-9\-\/]+)/i,
      /Policy[:\s]*([A-Z0-9\-\/]+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = product.product_name.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
  }
  
  return null;
};

/**
 * Extract product owner nickname from product
 */
export const extractProductOwnerNickname = (product: ProductPeriodSummary): string | null => {
  if (product.product_owner_name) {
    // Check if the product_owner_name contains multiple names (comma-separated or other delimiters)
    const ownerNames = product.product_owner_name.split(/[,&]/).map((name: string) => name.trim());
    if (ownerNames.length > 1) {
      // For multiple owners, return "Joint"
      return "Joint";
    } else {
      // For single owner, extract just the nickname (first word)
      const nameParts = product.product_owner_name.trim().split(' ');
      const nickname = nameParts[0]; // Take first part (nickname)
      return nickname;
    }
  }
  return null;
};

/**
 * Sort products by custom product owner order
 */
export const sortProductsByOwnerOrder = (products: ProductPeriodSummary[], productOwnerOrder: string[]): ProductPeriodSummary[] => {
  if (!productOwnerOrder || productOwnerOrder.length === 0) {
    // Fallback to alphabetical by provider name
    return products.sort((a, b) => {
      const providerA = a.provider_name || '';
      const providerB = b.provider_name || '';
      return providerA.localeCompare(providerB);
    });
  }

  return products.sort((a, b) => {
    const ownerA = extractProductOwnerNickname(a);
    const ownerB = extractProductOwnerNickname(b);
    
    // Get custom order indices
    const orderA = ownerA ? productOwnerOrder.indexOf(ownerA) : -1;
    const orderB = ownerB ? productOwnerOrder.indexOf(ownerB) : -1;
    
    // If both have custom order, use that
    if (orderA !== -1 && orderB !== -1) {
      const orderDiff = orderA - orderB;
      if (orderDiff !== 0) return orderDiff;
    }
    
    // If only one has custom order, that one comes first
    if (orderA !== -1 && orderB === -1) return -1;
    if (orderA === -1 && orderB !== -1) return 1;
    
    // If neither has custom order, or they're equal, sort by provider name
    const providerA = a.provider_name || '';
    const providerB = b.provider_name || '';
    return providerA.localeCompare(providerB);
  });
};

/**
 * Generate default product title (auto-generated without custom title)
 */
export const generateDefaultProductTitle = (product: ProductPeriodSummary, options?: { omitOwner?: boolean }): string => {
  let title = `${product.provider_name || 'Unknown Provider'}`;
  
  if (product.product_type) {
    // Simplify bond types to just "Bond"
    const simplifiedType = product.product_type.toLowerCase().includes('bond') ? 'Bond' : product.product_type;
    title += ` - ${simplifiedType}`;
  }
  
  // Add plan number if available (moved before owner nickname)
  const planNumber = extractPlanNumber(product);
  if (planNumber) {
    title += ` - ${planNumber}`;
  }
  
  // Only include owner nickname if not omitted (moved after plan number)
  if (!options?.omitOwner) {
    const ownerNickname = extractProductOwnerNickname(product);
    if (ownerNickname) {
      title += ` - ${ownerNickname}`;
    }
  }
  
  return title;
};

/**
 * Generate effective product title (considering custom titles)
 */
export const generateEffectiveProductTitle = (
  product: ProductPeriodSummary, 
  customTitles: Map<number, string>,
  options?: { omitOwner?: boolean }
): string => {
  // If there's a custom title, use it
  const customTitle = customTitles.get(product.id);
  if (customTitle && customTitle.trim()) {
    return customTitle.trim();
  }

  // Otherwise, generate the default title
  return generateDefaultProductTitle(product, options);
};

/**
 * Generate product display name for client groups and general display
 * Format: provider - type - product_name - plan_number - owner
 * Where product_name is the basic product description from the database
 */
export const generateProductDisplayName = (product: any): string => {
  const parts = [];

  // 1. Provider name
  if (product.provider_name) {
    parts.push(product.provider_name);
  }

  // 2. Product type
  if (product.product_type) {
    parts.push(product.product_type);
  }

  // 3. Product name (basic product description from database)
  if (product.product_name) {
    parts.push(product.product_name);
  }

  // 4. Plan number (if available)
  if (product.plan_number) {
    parts.push(product.plan_number);
  }

  // 5. Product owner(s) - show "Joint" if multiple, first name if single
  if (product.product_owners && product.product_owners.length > 0) {
    if (product.product_owners.length > 1) {
      parts.push('Joint');
    } else {
      // Extract first name from single owner
      const owner = product.product_owners[0];
      const firstName = owner.known_as || owner.firstname || 'Owner';
      parts.push(firstName);
    }
  }

  return parts.filter(Boolean).join(' - ');
};

 