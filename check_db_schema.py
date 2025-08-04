import asyncpg
import asyncio
import os

async def check_schema():
    try:
        # Connect to the database
        conn = await asyncpg.connect(
            user="kingstons_user",
            password="KingstonApp2024!",
            database="kingstons_portal",
            host="192.168.0.223",
            port=5432
        )
        
        print("🔗 Connected to PostgreSQL database!")
        
        # Check authentication table schema
        print("\n📋 Authentication table schema:")
        result = await conn.fetch("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'authentication' 
            ORDER BY ordinal_position;
        """)
        
        for row in result:
            print(f"  • {row['column_name']}: {row['data_type']} (nullable: {row['is_nullable']}) (default: {row['column_default']})") 
        
        # Check profiles table schema too
        print("\n📋 Profiles table schema:")
        result = await conn.fetch("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            ORDER BY ordinal_position;
        """)
        
        for row in result:
            print(f"  • {row['column_name']}: {row['data_type']} (nullable: {row['is_nullable']}) (default: {row['column_default']})") 
        
        # Check session table schema as well
        print("\n📋 Session table schema:")
        result = await conn.fetch("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'session' 
            ORDER BY ordinal_position;
        """)
        
        for row in result:
            print(f"  • {row['column_name']}: {row['data_type']} (nullable: {row['is_nullable']}) (default: {row['column_default']})") 
        
        await conn.close()
        print("\n✅ Database schema check complete!")
        
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")

if __name__ == "__main__":
    asyncio.run(check_schema()) 