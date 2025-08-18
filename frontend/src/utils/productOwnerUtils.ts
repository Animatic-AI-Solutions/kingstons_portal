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
 * Gets the display name for a product owner.
 * Uses the same logic as backend Pattern 2 (client_products.py):
 * Prioritizes known_as over firstname, then combines with surname.
 * This ensures consistency across all product owner display logic.
 */
export const getProductOwnerDisplayName = (owner: ProductOwner): string => {
  // Use the same logic as backend: known_as or firstname, then combine with surname
  const nickname = (owner.known_as && owner.known_as.trim()) || (owner.firstname && owner.firstname.trim()) || '';
  const surname = (owner.surname && owner.surname.trim()) || '';
  
  if (nickname && surname) {
    return `${nickname} ${surname}`;
  } else if (nickname) {
    return nickname;
  } else if (surname) {
    return surname;
  }
  
  return 'Unknown';
};

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