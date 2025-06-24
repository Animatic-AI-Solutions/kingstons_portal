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
  // Computed field from backend
  name?: string;
}

/**
 * Gets the display name for a product owner.
 * It will construct the name from "firstname surname".
 */
export const getProductOwnerDisplayName = (owner: ProductOwner): string => {
  // If backend provides computed name field, use it first
  if (owner.name) {
    return owner.name;
  }
  
  // Fallback to client-side computation
  const nameParts = [];
  if (owner.firstname && owner.firstname.trim() !== '') {
    nameParts.push(owner.firstname.trim());
  }
  if (owner.surname && owner.surname.trim() !== '') {
    nameParts.push(owner.surname.trim());
  }
  
  if (nameParts.length > 0) {
    return nameParts.join(' ');
  }
  
  // Use known_as as a last resort if other names are not available
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