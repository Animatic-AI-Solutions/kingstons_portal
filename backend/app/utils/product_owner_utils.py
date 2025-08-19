"""
Product Owner utilities for consistent name handling across the backend
"""

def get_product_owner_display_name(owner_data):
    """
    Gets the display name for a product owner.
    Logic: Show firstname + surname if both exist, otherwise show known_as, otherwise show whatever exists.
    This ensures proper name display: either formal name (firstname surname) or nickname (known_as).
    
    Args:
        owner_data: Dict containing owner fields (firstname, surname, known_as)
        
    Returns:
        str: The formatted display name
    """
    if not owner_data:
        return "Unknown"
        
    firstname = (owner_data.get('firstname') or '').strip()
    surname = (owner_data.get('surname') or '').strip()
    known_as = (owner_data.get('known_as') or '').strip()
    
    # Priority 1: If both firstname and surname exist, use formal name
    if firstname and surname:
        return f"{firstname} {surname}"
    
    # Priority 2: If known_as exists, use it
    if known_as:
        return known_as
    
    # Priority 3: Use whatever single field exists
    if firstname:
        return firstname
    
    if surname:
        return surname
    
    return "Unknown"