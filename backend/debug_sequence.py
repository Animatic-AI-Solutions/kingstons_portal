import asyncio
import asyncpg

async def debug_sequence_issue():
    # Use the actual database connection
    conn_str = 'postgresql://kingstons_app:KingstonApp2024!@192.168.0.223:5432/kingstons_portal'
    
    try:
        conn = await asyncpg.connect(conn_str)
        print(f"✅ Connected to production database")
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        return
    
    print("=== Checking available_portfolio_funds table state ===")
    
    # Check current max ID
    max_id = await conn.fetchval("SELECT MAX(id) FROM available_portfolio_funds")
    print(f"Current MAX(id): {max_id}")
    
    # Check sequence current value
    try:
        seq_val = await conn.fetchval("SELECT last_value FROM available_portfolio_funds_id_seq")
        print(f"Sequence last_value: {seq_val}")
    except Exception as e:
        print(f"Error checking sequence: {e}")
    
    # Check for generation 10 funds
    gen_10_funds = await conn.fetch("SELECT id, fund_id, target_weighting FROM available_portfolio_funds WHERE template_portfolio_generation_id = 10")
    print(f"Funds for generation 10: {len(gen_10_funds) if gen_10_funds else 0}")
    for fund in gen_10_funds or []:
        print(f"  ID: {fund['id']}, fund_id: {fund['fund_id']}, weighting: {fund['target_weighting']}")
    
    # Check for any ID gaps or issues
    id_check = await conn.fetch("SELECT id FROM available_portfolio_funds ORDER BY id")
    ids = [row['id'] for row in id_check] if id_check else []
    print(f"All IDs: {ids}")
    
    # Check if ID 17 exists
    id_17_check = await conn.fetchrow("SELECT * FROM available_portfolio_funds WHERE id = 17")
    print(f"ID 17 exists: {id_17_check is not None}")
    if id_17_check:
        print(f"ID 17 details: {dict(id_17_check)}")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(debug_sequence_issue())