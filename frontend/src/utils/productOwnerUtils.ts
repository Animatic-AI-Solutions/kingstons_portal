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
 * Prioritizes "firstname surname" when both are available, 
 * falls back to known_as when firstname and surname are not both present.
 */
export const getProductOwnerDisplayName = (owner: ProductOwner): string => {
  // Client-side computation with same logic as backend
  const nameParts = [];
  if (owner.firstname && owner.firstname.trim() !== '') {
    nameParts.push(owner.firstname.trim());
  }
  if (owner.surname && owner.surname.trim() !== '') {
    nameParts.push(owner.surname.trim());
  }
  
  // If we have both firstname and surname, use them
  if (nameParts.length === 2) {
    return nameParts.join(' ');
  }
  
  // If we only have one name part but known_as is available, prefer known_as
  if (nameParts.length === 1 && owner.known_as && owner.known_as.trim() !== '') {
    return owner.known_as.trim();
  }
  
  // If we have one name part but no known_as, use the single name part
  if (nameParts.length === 1) {
    return nameParts[0];
  }
  
  // If no firstname/surname, fall back to known_as
  if (owner.known_as && owner.known_as.trim() !== '') {
    return owner.known_as.trim();
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