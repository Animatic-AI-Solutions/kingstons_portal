"""
Frontend API Call Inventory Tool
Extracts all API calls from TypeScript/React files using regex patterns.
Simplified version that doesn't require TypeScript AST dependencies.
"""
import re
import json
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime


class FrontendAPIInventory:
    """Extract and inventory API calls from frontend source files."""

    def __init__(self, src_dir: str = "src"):
        self.src_dir = Path(src_dir)
        self.api_calls: List[Dict[str, Any]] = []
        self.file_count = 0

        # Regex patterns to match API calls
        self.patterns = [
            # String literals: "/api/client_groups"
            r'["\'](/api/[^"\']+)["\']',
            # Template literals: `/api/client_groups/${id}`
            r'`(/api/[^`]+)`',
            # axios/fetch calls
            r'(?:axios|fetch)\s*\(\s*["\']([^"\']+)["\']',
            r'(?:axios|fetch)\s*\(\s*`([^`]+)`',
        ]

    def find_source_files(self) -> List[Path]:
        """Find all TypeScript/JavaScript files in src directory."""
        files = []
        patterns = ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]

        for pattern in patterns:
            files.extend(self.src_dir.glob(pattern))

        # Filter out node_modules
        files = [f for f in files if "node_modules" not in str(f)]
        return files

    def extract_api_calls_from_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Extract API calls from a source file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return []

        file_calls = []
        lines = content.split('\n')

        for pattern in self.patterns:
            for match in re.finditer(pattern, content):
                api_path = match.group(1)

                # Only include paths starting with /api/
                if not api_path.startswith('/api/'):
                    continue

                # Find line number
                line_num = content[:match.start()].count('\n') + 1

                # Get context (the line containing the call)
                context = lines[line_num - 1].strip() if line_num <= len(lines) else ""

                # Simplify file path - just show from src/ onwards
                try:
                    rel_path = str(file_path.relative_to(self.src_dir.parent))
                except:
                    rel_path = str(file_path)

                file_calls.append({
                    "file": rel_path,
                    "line": line_num,
                    "path": api_path,
                    "has_underscore": "_" in api_path,
                    "context": context[:100]  # Limit context length
                })

        # Remove duplicates (same path, same file, same line)
        seen = set()
        unique_calls = []
        for call in file_calls:
            key = (call["file"], call["line"], call["path"])
            if key not in seen:
                seen.add(key)
                unique_calls.append(call)

        return unique_calls

    def generate_inventory(self) -> List[Dict[str, Any]]:
        """Generate inventory of all API calls."""
        print("\nScanning frontend files for API calls...")
        print("="*60)

        files = self.find_source_files()
        self.file_count = len(files)

        print(f"Found {len(files)} source files to analyze\n")

        for file_path in files:
            calls = self.extract_api_calls_from_file(file_path)
            if calls:
                self.api_calls.extend(calls)
                print(f"[OK] {file_path.name}: {len(calls)} API calls")

        print("="*60)
        print(f"\nTotal API calls found: {len(self.api_calls)}")

        underscore_calls = [c for c in self.api_calls if c["has_underscore"]]
        print(f"API calls with underscores: {len(underscore_calls)}")

        return self.api_calls

    def save_inventory(self, output_file: str = "migration_artifacts/frontend_api_inventory.json"):
        """Save inventory to JSON."""
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        inventory_data = {
            "generated_at": datetime.now().isoformat(),
            "files_scanned": self.file_count,
            "total_api_calls": len(self.api_calls),
            "calls_with_underscores": len([c for c in self.api_calls if c["has_underscore"]]),
            "api_calls": self.api_calls
        }

        with open(output_path, "w") as f:
            json.dump(inventory_data, f, indent=2)

        print(f"\n[OK] Inventory saved to {output_path}")

    def generate_update_checklist(self, output_file: str = "migration_artifacts/frontend_update_checklist.md"):
        """Generate markdown checklist grouped by file."""
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Group by file
        by_file = {}
        for call in self.api_calls:
            if call["has_underscore"]:
                if call["file"] not in by_file:
                    by_file[call["file"]] = []
                by_file[call["file"]].append(call)

        # Prioritize service files
        sorted_files = sorted(by_file.keys(), key=lambda f: (
            0 if "service" in f.lower() or "api.ts" in f.lower() else 1,
            f
        ))

        markdown = f"# Frontend API Path Update Checklist\n\n"
        markdown += f"Generated: {datetime.now().isoformat()}\n\n"
        markdown += f"## Summary\n\n"
        markdown += f"- Files requiring updates: {len(sorted_files)}\n"
        markdown += f"- Total API calls to update: {len([c for c in self.api_calls if c['has_underscore']])}\n\n"
        markdown += f"## Priority Order\n\n"
        markdown += f"Service files are listed first as they impact multiple components.\n\n"

        for file_path in sorted_files:
            calls = by_file[file_path]

            markdown += f"### `{file_path}` ({len(calls)} updates)\n\n"

            for call in calls:
                hyphenated = call["path"].replace("_", "-")
                markdown += f"- [ ] **Line {call['line']}**: `{call['path']}` -> `{hyphenated}`\n"
                markdown += f"  - Context: `{call['context']}`\n\n"

        with open(output_path, "w") as f:
            f.write(markdown)

        print(f"[OK] Update checklist saved to {output_path}")

    def print_summary(self):
        """Print summary to console."""
        print("\n" + "="*60)
        print("FRONTEND API CALL SUMMARY")
        print("="*60)

        underscore_calls = [c for c in self.api_calls if c["has_underscore"]]

        if not underscore_calls:
            print("[OK] All API calls already use hyphenated format!")
            return

        print("\nAPI paths requiring conversion:\n")

        # Get unique paths
        unique_paths = {}
        for call in underscore_calls:
            path = call["path"]
            if path not in unique_paths:
                unique_paths[path] = 0
            unique_paths[path] += 1

        for path in sorted(unique_paths.keys()):
            count = unique_paths[path]
            hyphenated = path.replace("_", "-")
            print(f"  {path} -> {hyphenated} ({count} occurrences)")

        print("\n" + "="*60)


def main():
    """Run the frontend API inventory tool."""
    import sys

    # Change to frontend directory if we're in migration_tools
    if Path.cwd().name == "migration_tools":
        import os
        os.chdir("..")

    inventory = FrontendAPIInventory("src")
    inventory.generate_inventory()
    inventory.save_inventory()
    inventory.generate_update_checklist()
    inventory.print_summary()

    print("\n[OK] Frontend API inventory complete!\n")


if __name__ == "__main__":
    main()
