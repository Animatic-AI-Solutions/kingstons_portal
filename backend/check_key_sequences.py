import asyncio
import asyncpg

async def check_key_sequences():
    conn_str = 'postgresql://kingstons_app:KingstonApp2024!@192.168.0.223:5432/kingstons_portal'
    
    try:
        conn = await asyncpg.connect(conn_str)
        print(f"✅ Connected to production database")
        
        # Key tables that likely have auto-increment IDs
        tables_to_check = [
            'available_portfolio_funds',
            'available_portfolios', 
            'template_portfolio_generations',
            'available_funds',
            'portfolios',
            'client_products',
            'client_groups',
            'portfolio_funds',
            'product_owners'
        ]
        
        print(f"Checking {len(tables_to_check)} key tables for sequence sync issues:\n")
        
        for table_name in tables_to_check:
            try:
                # Check if table exists and has max ID
                max_id = await conn.fetchval(f"SELECT MAX(id) FROM {table_name}")
                
                if max_id is None:
                    print(f"📋 {table_name}: Empty table")
                    continue
                
                # Try to get sequence value
                sequence_name = f"{table_name}_id_seq"
                try:
                    seq_val = await conn.fetchval(f"SELECT last_value FROM {sequence_name}")
                    
                    print(f"📋 {table_name}:")
                    print(f"   MAX(id): {max_id}, Sequence: {seq_val}")
                    
                    if max_id >= seq_val:
                        new_seq_val = max_id + 1
                        await conn.execute(f"ALTER SEQUENCE {sequence_name} RESTART WITH {new_seq_val}")
                        print(f"   ✅ Fixed! Sequence set to: {new_seq_val}")
                    else:
                        print(f"   ✓ Already synchronized")
                        
                except Exception as seq_error:
                    if "does not exist" in str(seq_error).lower():
                        print(f"📋 {table_name}: No sequence (not auto-increment)")
                    else:
                        print(f"📋 {table_name}: Sequence error - {seq_error}")
                
            except Exception as table_error:
                if "does not exist" in str(table_error).lower():
                    print(f"📋 {table_name}: Table does not exist")
                else:
                    print(f"📋 {table_name}: Error - {table_error}")
                
        await conn.close()
        print(f"\n🎉 Sequence check completed!")
        
    except Exception as e:
        print(f"❌ Error checking sequences: {e}")

if __name__ == "__main__":
    asyncio.run(check_key_sequences())