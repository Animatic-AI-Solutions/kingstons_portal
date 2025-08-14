import asyncio
import asyncpg

async def fix_sequence_sync():
    conn_str = 'postgresql://kingstons_app:KingstonApp2024!@192.168.0.223:5432/kingstons_portal'
    
    try:
        conn = await asyncpg.connect(conn_str)
        print(f"✅ Connected to production database")
        
        # Check current state
        max_id = await conn.fetchval("SELECT MAX(id) FROM available_portfolio_funds")
        seq_val = await conn.fetchval("SELECT last_value FROM available_portfolio_funds_id_seq")
        
        print(f"Before fix - MAX(id): {max_id}, Sequence: {seq_val}")
        
        # Fix the sequence by setting it to max_id + 1
        if max_id and max_id > seq_val:
            new_seq_val = max_id + 1
            await conn.execute(f"ALTER SEQUENCE available_portfolio_funds_id_seq RESTART WITH {new_seq_val}")
            print(f"✅ Sequence synchronized! Set to: {new_seq_val}")
            
            # Verify the fix
            updated_seq_val = await conn.fetchval("SELECT last_value FROM available_portfolio_funds_id_seq")
            print(f"After fix - Sequence: {updated_seq_val}")
        else:
            print("ℹ️ Sequence is already in sync")
            
        await conn.close()
        print("✅ Sequence fix completed successfully!")
        
    except Exception as e:
        print(f"❌ Error fixing sequence: {e}")

if __name__ == "__main__":
    asyncio.run(fix_sequence_sync())