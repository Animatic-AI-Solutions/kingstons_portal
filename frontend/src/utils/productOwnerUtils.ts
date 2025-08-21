/**
 * Product Owner utilities for handling name formatting and display
 */

export interface ProductOwner {
  id: number;
  firstname?: string;
  surname?: string;
  known_as?: string;
  status?: string;
  created_at?: string;
}

/**
 * Gets the formal display name for a product owner (for report headers, general display).
 * Logic: Use firstname + surname if both exist, otherwise fallback to known_as.
 * This ensures proper formal name display: prefer formal names over nicknames.
 */
export const getProductOwnerFormalDisplayName = (owner: ProductOwner): string => {
  console.log('🔍 [PRODUCT OWNER UTILS DEBUG] Input owner (formal):', {
    id: owner.id,
    firstname: owner.firstname,
    surname: owner.surname,
    known_as: owner.known_as
  });
  
  const firstname = (owner.firstname && owner.firstname.trim()) || '';
  const surname = (owner.surname && owner.surname.trim()) || '';
  const knownAs = (owner.known_as && owner.known_as.trim()) || '';
  
  console.log('🔍 [PRODUCT OWNER UTILS DEBUG] Processed fields (formal):', {
    firstname,
    surname,
    knownAs
  });
  
  // Priority 1: If both firstname and surname exist, use formal name
  if (firstname && surname) {
    const result = `${firstname} ${surname}`;
    console.log('🔍 [PRODUCT OWNER UTILS DEBUG] Using Priority 1 (firstname + surname):', result);
    return result;
  }
  
  // Priority 2: If known_as exists, use it as fallback
  if (knownAs) {
    console.log('🔍 [PRODUCT OWNER UTILS DEBUG] Using Priority 2 (known_as fallback):', knownAs);
    return knownAs;
  }
  
  // Priority 3: Use whatever single field exists
  if (firstname) {
    console.log('🔍 [PRODUCT OWNER UTILS DEBUG] Using Priority 3 (firstname only):', firstname);
    return firstname;
  }
  
  if (surname) {
    console.log('🔍 [PRODUCT OWNER UTILS DEBUG] Using Priority 3 (surname only):', surname);
    return surname;
  }
  
  console.log('🔍 [PRODUCT OWNER UTILS DEBUG] Using fallback: Unknown');
  return 'Unknown';
};

/**
 * Gets the known_as display name for a product owner (for product names in reports).
 * Logic: Always use known_as if available, otherwise fallback to firstname + surname.
 * This ensures product names always show the preferred nickname.
 */
export const getProductOwnerKnownAsDisplayName = (owner: ProductOwner): string => {
  console.log('🔍 [PRODUCT OWNER UTILS DEBUG] Input owner (known_as):', {
    id: owner.id,
    firstname: owner.firstname,
    surname: owner.surname,
    known_as: owner.known_as
  });
  
  const firstname = (owner.firstname && owner.firstname.trim()) || '';
  const surname = (owner.surname && owner.surname.trim()) || '';
  const knownAs = (owner.known_as && owner.known_as.trim()) || '';
  
  console.log('🔍 [PRODUCT OWNER UTILS DEBUG] Processed fields (known_as):', {
    firstname,
    surname,
    knownAs
  });
  
  // Priority 1: If known_as exists, always use it
  if (knownAs) {
    console.log('🔍 [PRODUCT OWNER UTILS DEBUG] Using Priority 1 (known_as):', knownAs);
    return knownAs;
  }
  
  // Priority 2: Fallback to firstname + surname if both exist
  if (firstname && surname) {
    const result = `${firstname} ${surname}`;
    console.log('🔍 [PRODUCT OWNER UTILS DEBUG] Using Priority 2 (firstname + surname fallback):', result);
    return result;
  }
  
  // Priority 3: Use whatever single field exists
  if (firstname) {
    console.log('🔍 [PRODUCT OWNER UTILS DEBUG] Using Priority 3 (firstname only):', firstname);
    return firstname;
  }
  
  if (surname) {
    console.log('🔍 [PRODUCT OWNER UTILS DEBUG] Using Priority 3 (surname only):', surname);
    return surname;
  }
  
  console.log('🔍 [PRODUCT OWNER UTILS DEBUG] Using fallback: Unknown');
  return 'Unknown';
};

/**
 * @deprecated Use getProductOwnerFormalDisplayName or getProductOwnerKnownAsDisplayName instead
 * Legacy function - kept for backwards compatibility
 */
export const getProductOwnerDisplayName = getProductOwnerFormalDisplayName;

/**
 * Gets the formal name (firstname + surname) for a product owner
 */
export const getProductOwnerFormalName = (owner: ProductOwner): string => {
  const nameParts = [];
  if (owner.firstname && owner.firstname.trim() !== '') {
    nameParts.push(owner.firstname.trim());
  }
  if (owner.surname && owner.surname.trim() !== '') {
    nameParts.push(owner.surname.trim());
  }
  
  return nameParts.length > 0 ? nameParts.join(' ') : 'Unknown';
};

/**
 * Gets initials for a product owner
 */
export const getProductOwnerInitials = (owner: ProductOwner): string => {
  let initials = '';
  
  if (owner.firstname && owner.firstname.trim() !== '') {
    initials += owner.firstname.trim().charAt(0).toUpperCase();
  }
  
  if (owner.surname && owner.surname.trim() !== '') {
    initials += owner.surname.trim().charAt(0).toUpperCase();
  }
  
  return initials || '?';
};

/**
 * Creates a search-friendly string for a product owner
 */
export const getProductOwnerSearchString = (owner: ProductOwner): string => {
  const searchParts = [];
  
  if (owner.firstname) {
    searchParts.push(owner.firstname.toLowerCase().trim());
  }
  
  if (owner.surname) {
    searchParts.push(owner.surname.toLowerCase().trim());
  }
  
  if (owner.known_as) {
    searchParts.push(owner.known_as.toLowerCase().trim());
  }
  
  return searchParts.join(' ');
}; 