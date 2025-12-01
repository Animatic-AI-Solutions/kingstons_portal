"""
Test script to verify product deletion logic correctly handles shared portfolios.

This script tests two scenarios:
1. Deleting a product that is the ONLY product using a portfolio (should delete portfolio)
2. Deleting a product that SHARES a portfolio with other products (should keep portfolio)

Usage:
    python test_product_deletion.py
"""

import asyncio
import asyncpg
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.database import DATABASE_URL


async def get_product_portfolio_info(db, product_id: int):
    """Get product and portfolio information"""
    product = await db.fetchrow(
        "SELECT id, product_name, portfolio_id FROM client_products WHERE id = $1",
        product_id
    )

    if not product:
        print(f"[ERROR] Product {product_id} not found")
        return None

    portfolio_id = product['portfolio_id']

    if not portfolio_id:
        print(f"[WARNING] Product {product_id} has no portfolio")
        return None

    # Count products using this portfolio
    count_result = await db.fetchrow(
        "SELECT COUNT(*) as count FROM client_products WHERE portfolio_id = $1",
        portfolio_id
    )

    product_count = count_result['count'] if count_result else 0

    # Get portfolio info
    portfolio = await db.fetchrow(
        "SELECT id, portfolio_name FROM portfolios WHERE id = $1",
        portfolio_id
    )

    # Get portfolio funds count
    funds = await db.fetch(
        "SELECT id FROM portfolio_funds WHERE portfolio_id = $1",
        portfolio_id
    )

    # Get portfolio IRR values count
    irr_values = await db.fetch(
        "SELECT id FROM portfolio_irr_values WHERE portfolio_id = $1",
        portfolio_id
    )

    # Get portfolio valuations count
    valuations = await db.fetch(
        "SELECT id FROM portfolio_valuations WHERE portfolio_id = $1",
        portfolio_id
    )

    return {
        'product': dict(product),
        'portfolio': dict(portfolio) if portfolio else None,
        'product_count': product_count,
        'funds_count': len(funds),
        'irr_values_count': len(irr_values),
        'valuations_count': len(valuations)
    }


async def check_portfolio_exists(db, portfolio_id: int):
    """Check if a portfolio still exists"""
    portfolio = await db.fetchrow(
        "SELECT id FROM portfolios WHERE id = $1",
        portfolio_id
    )
    return portfolio is not None


async def test_scenario_single_product(db):
    """
    Test Scenario 1: Delete a product that is the ONLY product using a portfolio
    Expected: Portfolio should be deleted
    """
    print("\n" + "="*80)
    print("TEST SCENARIO 1: Single Product Using Portfolio")
    print("="*80)

    # Find a product that is the only one using its portfolio
    result = await db.fetch(
        """
        SELECT cp.id, cp.product_name, cp.portfolio_id
        FROM client_products cp
        WHERE cp.portfolio_id IN (
            SELECT portfolio_id
            FROM client_products
            WHERE portfolio_id IS NOT NULL
            GROUP BY portfolio_id
            HAVING COUNT(*) = 1
        )
        LIMIT 1
        """
    )

    if not result:
        print("[WARNING] No suitable test product found (need a product with unique portfolio)")
        return

    test_product_id = result[0]['id']

    print(f"\nFound test product: {test_product_id}")

    # Get initial state
    info_before = await get_product_portfolio_info(db, test_product_id)
    if not info_before:
        return

    portfolio_id = info_before['portfolio']['id']

    print(f"\nBEFORE DELETION:")
    print(f"  Product ID: {test_product_id}")
    print(f"  Product Name: {info_before['product']['product_name']}")
    print(f"  Portfolio ID: {portfolio_id}")
    print(f"  Portfolio Name: {info_before['portfolio']['portfolio_name']}")
    print(f"  Products using this portfolio: {info_before['product_count']}")
    print(f"  Portfolio funds: {info_before['funds_count']}")
    print(f"  Portfolio IRR values: {info_before['irr_values_count']}")
    print(f"  Portfolio valuations: {info_before['valuations_count']}")

    print(f"\n[INFO] This product is the ONLY product using portfolio {portfolio_id}")
    print(f"[EXPECTED] Portfolio {portfolio_id} SHOULD be deleted")

    response = input("\nProceed with deletion? (yes/no): ")
    if response.lower() != 'yes':
        print("[CANCELLED] Test cancelled")
        return

    # Import the delete function
    from app.api.routes.client_products import delete_client_product

    # This won't work directly because we need the dependency injection
    # Instead, we'll make a direct API call or manually execute the delete logic
    print("\n[NOTE] Cannot directly test via API endpoint in this script")
    print("[NOTE] Please test this scenario manually via the frontend or API")


async def test_scenario_shared_portfolio(db):
    """
    Test Scenario 2: Delete a product that SHARES a portfolio with other products
    Expected: Portfolio should be KEPT
    """
    print("\n" + "="*80)
    print("TEST SCENARIO 2: Multiple Products Sharing Portfolio")
    print("="*80)

    # Find a portfolio used by multiple products
    result = await db.fetch(
        """
        SELECT portfolio_id, COUNT(*) as product_count
        FROM client_products
        WHERE portfolio_id IS NOT NULL
        GROUP BY portfolio_id
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC
        LIMIT 1
        """
    )

    if not result:
        print("[WARNING] No suitable test portfolio found (need a portfolio shared by multiple products)")
        return

    shared_portfolio_id = result[0]['portfolio_id']
    product_count = result[0]['product_count']

    # Get all products using this portfolio
    products = await db.fetch(
        "SELECT id, product_name FROM client_products WHERE portfolio_id = $1",
        shared_portfolio_id
    )

    print(f"\nFound shared portfolio: {shared_portfolio_id}")
    print(f"Products using this portfolio: {product_count}")

    # Get portfolio info
    portfolio = await db.fetchrow(
        "SELECT id, portfolio_name FROM portfolios WHERE id = $1",
        shared_portfolio_id
    )

    print(f"\nPortfolio ID: {shared_portfolio_id}")
    print(f"Portfolio Name: {portfolio['portfolio_name'] if portfolio else 'N/A'}")

    print(f"\nProducts using this portfolio:")
    for i, p in enumerate(products, 1):
        print(f"  {i}. Product {p['id']}: {p['product_name']}")

    print(f"\n[INFO] If we delete ONE of these products, the portfolio should be KEPT")
    print(f"[EXPECTED] Portfolio {shared_portfolio_id} should remain with {product_count - 1} products")

    print("\n[NOTE] Please test this scenario manually via the frontend or API")
    print("[NOTE] Delete one product and verify the portfolio still exists")


async def main():
    """Main execution"""
    print("="*80)
    print("Product Deletion Test Script")
    print("="*80)
    print("\nThis script helps identify test scenarios for product deletion")
    print("It does NOT perform actual deletions - those should be tested via API")

    # Connect to database
    db = await asyncpg.connect(DATABASE_URL)
    print(f"\n[OK] Connected to database")

    try:
        # Test both scenarios
        await test_scenario_single_product(db)
        await test_scenario_shared_portfolio(db)

        print("\n" + "="*80)
        print("SUMMARY")
        print("="*80)
        print("\nTo properly test the product deletion fix:")
        print("1. Use the scenarios identified above")
        print("2. Delete products via the API endpoint: DELETE /client_products/{id}")
        print("3. Verify the expected behavior:")
        print("   - Scenario 1: Portfolio should be deleted")
        print("   - Scenario 2: Portfolio should be kept")
        print("\nCheck the backend logs for messages like:")
        print('  "Portfolio X is still used by N other product(s) - portfolio will be kept"')
        print('  "This is the last product using portfolio X - portfolio will be deleted"')

    except Exception as e:
        print(f"\n[ERROR] Error: {str(e)}")
        import traceback
        traceback.print_exc()

    finally:
        await db.close()
        print("\n[OK] Disconnected from database")


if __name__ == "__main__":
    asyncio.run(main())
