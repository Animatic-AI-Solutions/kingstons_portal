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
 * Extract product owner nickname from product for display in product titles.
 * Uses known_as from product_owners array if available, otherwise falls back to product_owner_name.
 */
export const extractProductOwnerNickname = (product: ProductPeriodSummary): string | null => {
  console.log('🔍 [PRODUCT TITLE DEBUG] extractProductOwnerNickname called for product:', {
    id: product.id,
    product_name: product.product_name,
    product_owner_name: product.product_owner_name,
    product_owners_count: product.product_owners?.length || 0
  });

  // Priority 1: Use product_owners array data (has known_as support) - if available
  if (product.product_owners && product.product_owners.length > 0) {
    console.log('🔍 [PRODUCT TITLE DEBUG] Using product_owners array data');
    if (product.product_owners.length > 1) {
      // For multiple owners, return "Joint"
      console.log('🔍 [PRODUCT TITLE DEBUG] Multiple owners, returning "Joint"');
      return "Joint";
    } else {
      // For single owner, use known_as if available
      const owner = product.product_owners[0];
      console.log('🔍 [PRODUCT TITLE DEBUG] Single owner data:', {
        id: owner.id,
        firstname: owner.firstname,
        surname: owner.surname,
        known_as: owner.known_as
      });
      
      const knownAs = (owner.known_as && owner.known_as.trim()) || '';
      if (knownAs) {
        console.log('🔍 [PRODUCT TITLE DEBUG] Using known_as:', knownAs);
        return knownAs;
      }
      
      // Fallback to firstname if no known_as
      const firstname = (owner.firstname && owner.firstname.trim()) || '';
      if (firstname) {
        console.log('🔍 [PRODUCT TITLE DEBUG] Fallback to firstname:', firstname);
        return firstname;
      }
    }
  }
  
  // Priority 2: Fallback to product_owner_name string (when no product_owners array available)
  if (product.product_owner_name) {
    console.log('🔍 [PRODUCT TITLE DEBUG] Using fallback product_owner_name string:', product.product_owner_name);
    // Check if the product_owner_name contains multiple names (comma-separated or other delimiters)
    const ownerNames = product.product_owner_name.split(/[,&]/).map((name: string) => name.trim());
    if (ownerNames.length > 1) {
      // For multiple owners, return "Joint"
      console.log('🔍 [PRODUCT TITLE DEBUG] Multiple names in string, returning "Joint"');
      return "Joint";
    } else {
      // For single owner, extract just the nickname (first word)
      const nameParts = product.product_owner_name.trim().split(' ');
      const nickname = nameParts[0]; // Take first part (nickname)
      console.log('🔍 [PRODUCT TITLE DEBUG] Using first part of name string:', nickname);
      return nickname;
    }
  }
  
  console.log('🔍 [PRODUCT TITLE DEBUG] No owner data found, returning null');
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
  console.log('🔍 [PRODUCT TITLE DEBUG] generateDefaultProductTitle called for product:', {
    id: product.id,
    product_name: product.product_name,
    provider_name: product.provider_name,
    omitOwner: options?.omitOwner
  });

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
    console.log('🔍 [PRODUCT TITLE DEBUG] About to extract owner nickname...');
    const ownerNickname = extractProductOwnerNickname(product);
    console.log('🔍 [PRODUCT TITLE DEBUG] Extracted owner nickname:', ownerNickname);
    if (ownerNickname) {
      title += ` - ${ownerNickname}`;
    }
  } else {
    console.log('🔍 [PRODUCT TITLE DEBUG] Owner omitted from title');
  }
  
  console.log('🔍 [PRODUCT TITLE DEBUG] Final title:', title);
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
  console.log('🔍 [PRODUCT TITLE DEBUG] generateEffectiveProductTitle called for product:', {
    id: product.id,
    customTitlesSize: customTitles.size,
    hasCustomTitle: customTitles.has(product.id)
  });

  // If there's a custom title, use it
  const customTitle = customTitles.get(product.id);
  if (customTitle && customTitle.trim()) {
    console.log('🔍 [PRODUCT TITLE DEBUG] Using custom title:', customTitle);
    return customTitle.trim();
  }

  console.log('🔍 [PRODUCT TITLE DEBUG] No custom title, generating default...');
  // Otherwise, generate the default title
  return generateDefaultProductTitle(product, options);
};

/**
 * Generate product display name for client groups and general display
 * Format: provider - name - plan_number - product_owner
 * Where product_name is the basic product description from the database
 */
export const generateProductDisplayName = (product: any): string => {
  const parts = [];

  // 1. Provider name
  if (product.provider_name) {
    parts.push(product.provider_name);
  }

  // 2. Product name (basic product description from database)
  if (product.product_name) {
    parts.push(product.product_name);
  }

  // 3. Plan number (if available) - try both direct field and extraction
  let planNumber = product.plan_number;
  if (!planNumber) {
    planNumber = extractPlanNumber(product);
  }
  
  if (planNumber) {
    parts.push(planNumber);
  }

  // 4. Product owner(s) - show "Joint" if multiple, first name if single
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

 