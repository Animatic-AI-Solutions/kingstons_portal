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
 * Logic: Show firstname + surname if both exist, otherwise show known_as, otherwise show whatever exists.
 * This ensures proper name display: either formal name (firstname surname) or nickname (known_as).
 */
export const getProductOwnerDisplayName = (owner: ProductOwner): string => {
  const firstname = (owner.firstname && owner.firstname.trim()) || '';
  const surname = (owner.surname && owner.surname.trim()) || '';
  const knownAs = (owner.known_as && owner.known_as.trim()) || '';
  
  // Priority 1: If both firstname and surname exist, use formal name
  if (firstname && surname) {
    return `${firstname} ${surname}`;
  }
  
  // Priority 2: If known_as exists, use it
  if (knownAs) {
    return knownAs;
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