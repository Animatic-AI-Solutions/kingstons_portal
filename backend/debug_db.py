import sys
sys.path.append('.')
from app.db.database import get_db

def debug_product_owners():
    db = get_db()
    
    print('=== PRODUCT_OWNERS TABLE ===')
    result = db.table('product_owners').select('id, firstname, surname, known_as').limit(10).execute()
    print('Sample product_owners data:')
    for owner in result.data:
        print(f'ID: {owner.get("id")}, firstname: "{owner.get("firstname")}", surname: "{owner.get("surname")}", known_as: "{owner.get("known_as")}"')
    
    print('\n=== PRODUCT_OWNER_PRODUCTS JUNCTION TABLE ===')
    result2 = db.table('product_owner_products').select('product_owner_id, product_id').limit(10).execute()
    print('Sample product_owner_products relationships:')
    for rel in result2.data:
        print(f'Owner ID: {rel.get("product_owner_id")}, Product ID: {rel.get("product_id")}')
    
    print('\n=== CLIENT_PRODUCTS TABLE ===')
    result3 = db.table('client_products').select('id, product_name, product_owner_name').limit(10).execute()
    print('Sample client_products data:')
    for product in result3.data:
        print(f'ID: {product.get("id")}, Name: "{product.get("product_name")}", Owner Name: "{product.get("product_owner_name")}"')
    
    print('\n=== TESTING CLIENT_PRODUCTS_WITH_OWNERS ENDPOINT LOGIC ===')
    # Test the logic that the endpoint uses
    products_result = db.table('client_products').select('id, client_id, product_name').limit(3).execute()
    
    for product in products_result.data:
        product_id = product.get("id")
        print(f'\nProduct ID {product_id}: {product.get("product_name")}')
        
        # Get product owner associations
        pop_result = db.table("product_owner_products").select("product_owner_id").eq("product_id", product_id).execute()
        if pop_result.data:
            owner_ids = [assoc.get("product_owner_id") for assoc in pop_result.data]
            print(f'  Owner IDs: {owner_ids}')
            
            # Get owner details
            if owner_ids:
                owners_result = db.table("product_owners").select("id, firstname, surname, known_as").in_("id", owner_ids).execute()
                for owner in owners_result.data:
                    print(f'  Owner: firstname="{owner.get("firstname")}", surname="{owner.get("surname")}", known_as="{owner.get("known_as")}"')
                    
                    # Test the new logic
                    firstname = owner.get('firstname') or owner.get('known_as') or ""
                    surname = owner.get('surname') or ""
                    if firstname and surname:
                        product_owner_name = f"{firstname} {surname}"
                    elif firstname:
                        product_owner_name = firstname
                    elif surname:
                        product_owner_name = surname
                    else:
                        product_owner_name = "No Owner"
                    
                    print(f'  Constructed name: "{product_owner_name}"')
        else:
            print('  No owners found')

if __name__ == "__main__":
    debug_product_owners() 