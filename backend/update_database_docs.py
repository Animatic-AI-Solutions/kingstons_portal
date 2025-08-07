#!/usr/bin/env python3
"""
Database Documentation Update Script for Kingston's Portal
==========================================================

This script automates the complete database documentation process:
1. Generates comprehensive database structure documentation
2. Creates detailed analysis report
3. Moves files to the appropriate docs folder
4. Updates timestamps and validates completeness

Usage:
    python update_database_docs.py
"""

import asyncio
import asyncpg
import os
import sys
import shutil
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Import our documentation generators
from generate_database_documentation import main as generate_structure_docs
from database_analysis_report import main as generate_analysis_report

# Load environment variables
load_dotenv()

def print_header():
    """Print a nice header for the script"""
    print("=" * 70)
    print("KINGSTON'S PORTAL - DATABASE DOCUMENTATION UPDATE")
    print("=" * 70)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

def print_step(step_num, description):
    """Print a formatted step"""
    print(f"📋 Step {step_num}: {description}")
    print("-" * 50)

async def verify_database_connection():
    """Verify we can connect to the database"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ ERROR: DATABASE_URL not found in environment variables")
        return False
    
    try:
        conn = await asyncpg.connect(database_url)
        db_info = await conn.fetchrow("SELECT current_database(), current_user, version()")
        await conn.close()
        
        print(f"✅ Database Connection Verified")
        print(f"   Database: {db_info['current_database']}")
        print(f"   User: {db_info['current_user']}")
        print(f"   Version: {db_info['version'][:50]}...")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def setup_docs_directory():
    """Create the database documentation directory if it doesn't exist"""
    docs_dir = Path("../docs/7_database_documentation")
    docs_dir.mkdir(parents=True, exist_ok=True)
    print(f"✅ Documentation directory ready: {docs_dir.resolve()}")
    return docs_dir

def move_generated_files(docs_dir):
    """Move generated files to the docs directory"""
    files_to_move = [
        ("database_structure_documentation.sql", "Complete database schema"),
        ("database_analysis_report.md", "Database analysis report")
    ]
    
    moved_files = []
    for filename, description in files_to_move:
        source = Path(filename)
        if source.exists():
            destination = docs_dir / filename
            shutil.move(str(source), str(destination))
            print(f"✅ Moved {description}: {destination}")
            moved_files.append(destination)
        else:
            print(f"⚠️  Warning: {filename} not found")
    
    return moved_files

def generate_summary_report(moved_files, docs_dir):
    """Generate a summary report of what was updated"""
    summary_content = f"""# Database Documentation Update Summary

**Generated on:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Script:** update_database_docs.py

## Files Updated

"""
    
    for file_path in moved_files:
        file_size = file_path.stat().st_size
        file_size_kb = round(file_size / 1024, 1)
        
        summary_content += f"### {file_path.name}\n"
        summary_content += f"- **Size:** {file_size_kb} KB\n"
        summary_content += f"- **Location:** `{file_path.relative_to(Path('../'))}`\n"
        summary_content += f"- **Last Modified:** {datetime.fromtimestamp(file_path.stat().st_mtime).strftime('%Y-%m-%d %H:%M:%S')}\n\n"
    
    summary_content += """## Next Steps

1. **Review Generated Documentation:** Check the SQL structure and analysis report for accuracy
2. **Update Related Documentation:** Consider updating architectural documentation if major changes were detected
3. **Commit Changes:** Add the updated documentation to version control
4. **Share with Team:** Notify team members of documentation updates

## Regeneration Instructions

To regenerate this documentation in the future:

```bash
# From the backend directory with virtual environment activated
python update_database_docs.py
```

This will automatically:
- Generate fresh database structure documentation
- Create updated analysis report  
- Move files to the correct documentation location
- Create this summary report
"""
    
    summary_file = docs_dir / "LAST_UPDATE_SUMMARY.md"
    with open(summary_file, 'w', encoding='utf-8') as f:
        f.write(summary_content)
    
    print(f"✅ Created update summary: {summary_file}")
    return summary_file

async def main():
    """Main function to orchestrate the documentation update"""
    print_header()
    
    try:
        # Step 1: Verify database connection
        print_step(1, "Verifying Database Connection")
        if not await verify_database_connection():
            print("❌ Cannot proceed without database connection")
            sys.exit(1)
        print()
        
        # Step 2: Setup documentation directory
        print_step(2, "Setting Up Documentation Directory")
        docs_dir = setup_docs_directory()
        print()
        
        # Step 3: Generate database structure documentation
        print_step(3, "Generating Database Structure Documentation")
        print("Running generate_database_documentation.py...")
        await generate_structure_docs()
        print()
        
        # Step 4: Generate analysis report
        print_step(4, "Generating Database Analysis Report")
        print("Running database_analysis_report.py...")
        await generate_analysis_report()
        print()
        
        # Step 5: Move files to docs directory
        print_step(5, "Moving Files to Documentation Directory")
        moved_files = move_generated_files(docs_dir)
        print()
        
        # Step 6: Generate summary report
        print_step(6, "Creating Update Summary")
        summary_file = generate_summary_report(moved_files, docs_dir)
        print()
        
        # Final summary
        print("=" * 70)
        print("✅ DATABASE DOCUMENTATION UPDATE COMPLETED SUCCESSFULLY!")
        print("=" * 70)
        print(f"📁 Documentation Location: {docs_dir.resolve()}")
        print(f"📋 Files Generated: {len(moved_files) + 1}")
        print(f"⏰ Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        print("📖 Documentation Files:")
        for file_path in moved_files + [summary_file]:
            print(f"   - {file_path.name}")
        print()
        print("🔄 To regenerate in the future, run: python update_database_docs.py")
        print("=" * 70)
        
    except Exception as e:
        print(f"❌ Error during documentation update: {e}")
        print("🔍 Check the error details above and ensure:")
        print("   - Database connection is working")
        print("   - Virtual environment is activated")
        print("   - All required dependencies are installed")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
