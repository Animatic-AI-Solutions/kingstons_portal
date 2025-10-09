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
 * Logic: Use known_as + surname if both exist, otherwise just known_as, fallback to firstname + surname.
 * This follows site-wide UI guidance to prefer known_as format over formal names.
 */
export const getProductOwnerFormalDisplayName = (owner: ProductOwner): string => {
  const firstname = (owner.firstname && owner.firstname.trim()) || '';
  const surname = (owner.surname && owner.surname.trim()) || '';
  const knownAs = (owner.known_as && owner.known_as.trim()) || '';

  // Priority 1: If known_as exists, use 'known_as + surname' format or just known_as
  if (knownAs) {
    return surname ? `${knownAs} ${surname}` : knownAs;
  }

  // Priority 2: Fallback to firstname + surname if both exist (when no known_as)
  if (firstname && surname) {
    return `${firstname} ${surname}`;
  }

  // Priority 3: Use whatever single field exists
  if (firstname) {
    return firstname;
  }

  if (surname) {
    return surname;
  }

  return 'Unknown';
};

/**
 * Gets the known_as display name for a product owner (for product names in reports).
 * Logic: Always use known_as if available, otherwise fallback to firstname + surname.
 * This ensures product names always show the preferred nickname.
 */
export const getProductOwnerKnownAsDisplayName = (owner: ProductOwner): string => {
  const firstname = (owner.firstname && owner.firstname.trim()) || '';
  const surname = (owner.surname && owner.surname.trim()) || '';
  const knownAs = (owner.known_as && owner.known_as.trim()) || '';

  // Priority 1: If known_as exists, always use it
  if (knownAs) {
    return knownAs;
  }

  // Priority 2: Fallback to firstname + surname if both exist
  if (firstname && surname) {
    return `${firstname} ${surname}`;
  }

  // Priority 3: Use whatever single field exists
  if (firstname) {
    return firstname;
  }

  if (surname) {
    return surname;
  }

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