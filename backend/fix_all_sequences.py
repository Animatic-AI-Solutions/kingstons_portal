import asyncio
import asyncpg

async def fix_all_sequences():
    conn_str = 'postgresql://kingstons_app:KingstonApp2024!@192.168.0.223:5432/kingstons_portal'
    
    try:
        conn = await asyncpg.connect(conn_str)
        print(f"✅ Connected to production database")
        
        # Get all sequences that might need fixing
        sequences = await conn.fetch("""
            SELECT
                n.nspname as schema_name,
                c.relname as table_name,
                a.attname as column_name,
                pg_get_serial_sequence(n.nspname||'.'||c.relname, a.attname) as sequence_name
            FROM
                pg_attribute a
            JOIN
                pg_class c ON a.attrelid = c.oid
            JOIN
                pg_namespace n ON c.relnamespace = n.oid
            WHERE
                a.atthasdef = true
                AND pg_get_serial_sequence(n.nspname||'.'||c.relname, a.attname) IS NOT NULL
                AND n.nspname = 'public'
                AND c.relkind = 'r'
        """)
        
        print(f"Found {len(sequences)} sequences to check:")
        
        for seq in sequences:
            table_name = seq['table_name']
            sequence_name = seq['sequence_name'].split('.')[-1]  # Remove schema prefix
            
            # Get current max ID and sequence value
            try:
                max_id = await conn.fetchval(f"SELECT MAX(id) FROM {table_name}")
                seq_val = await conn.fetchval(f"SELECT last_value FROM {sequence_name}")
                
                print(f"\n📋 Table: {table_name}")
                print(f"   MAX(id): {max_id}, Sequence: {seq_val}")
                
                if max_id and max_id >= seq_val:
                    new_seq_val = max_id + 1
                    await conn.execute(f"ALTER SEQUENCE {sequence_name} RESTART WITH {new_seq_val}")
                    print(f"   ✅ Fixed! Sequence set to: {new_seq_val}")
                else:
                    print(f"   ✓ Already synchronized")
                    
            except Exception as table_error:
                print(f"   ❌ Error checking {table_name}: {table_error}")
                
        await conn.close()
        print(f"\n🎉 All sequences synchronized successfully!")
        
    except Exception as e:
        print(f"❌ Error fixing sequences: {e}")

if __name__ == "__main__":
    asyncio.run(fix_all_sequences())