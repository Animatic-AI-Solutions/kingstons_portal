"""
Frontend API Path Migration Script
Automatically converts underscore API paths to hyphenated format in TypeScript/React files.
"""
import re
import json
from pathlib import Path
from typing import Dict, List, Tuple

class FrontendAPIMigrator:
    """Migrate frontend API paths from underscore to hyphenated format."""

    def __init__(self, src_dir: str = "../src"):
        self.src_dir = Path(src_dir).resolve()
        self.transformations: List[Dict] = []

        # Conversion patterns
        self.patterns = [
            # Match API paths in various contexts
            (r"'/api/([^']+)'", lambda m: f"'/api/{self._convert_path(m.group(1))}'"),
            (r'"/api/([^"]+)"', lambda m: f'"/api/{self._convert_path(m.group(1))}"'),
            (r'`/api/([^`]+)`', lambda m: f'`/api/{self._convert_path(m.group(1))}`'),
        ]

    def _convert_path(self, path: str) -> str:
        """
        Convert underscore path to hyphenated format.
        Preserves template literals ${...} and query parameters.
        """
        # Don't convert if already hyphenated or if it contains template literal
        if '_' not in path:
            return path

        result = []
        i = 0
        while i < len(path):
            # Preserve template literals ${...}
            if i < len(path) - 1 and path[i:i+2] == '${':
                end = path.find('}', i)
                if end != -1:
                    result.append(path[i:end+1])
                    i = end + 1
                    continue

            # Preserve query parameters (after ?)
            if path[i] == '?':
                result.append(path[i:])
                break

            # Convert underscores to hyphens
            if path[i] == '_':
                result.append('-')
            else:
                result.append(path[i])

            i += 1

        return ''.join(result)

    def migrate_file(self, file_path: Path, dry_run: bool = True) -> int:
        """
        Migrate API paths in a single file.
        Returns number of changes made.
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            original_content = content
            changes_count = 0

            # Apply each pattern
            for pattern, replacement in self.patterns:
                matches = list(re.finditer(pattern, content))
                for match in matches:
                    original = match.group(0)
                    converted = replacement(match)

                    if original != converted:
                        content = content.replace(original, converted, 1)
                        changes_count += 1

                        # Track transformation
                        self.transformations.append({
                            "file": str(file_path.relative_to(self.src_dir.parent)),
                            "original": original,
                            "converted": converted
                        })

            # Write changes if not dry run
            if not dry_run and changes_count > 0:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)

            return changes_count

        except Exception as e:
            print(f"  Error processing {file_path}: {e}")
            return 0

    def migrate_all(self, file_patterns: List[str] = ["**/*.tsx", "**/*.ts"], dry_run: bool = True) -> Dict:
        """
        Migrate all matching files in the src directory.
        """
        self.transformations = []
        total_files = 0
        total_changes = 0

        print("="*70)
        print("FRONTEND API PATH MIGRATION")
        print("="*70)
        print(f"Source directory: {self.src_dir}")
        print(f"Mode: {'DRY RUN' if dry_run else 'APPLY CHANGES'}")
        print()

        # Find all matching files
        all_files = []
        for pattern in file_patterns:
            all_files.extend(self.src_dir.glob(pattern))

        all_files = sorted(set(all_files))

        # Process each file
        for file_path in all_files:
            changes = self.migrate_file(file_path, dry_run=dry_run)
            if changes > 0:
                total_files += 1
                total_changes += changes
                rel_path = file_path.relative_to(self.src_dir.parent)
                print(f"  [OK] {rel_path}: {changes} changes")

        print()
        print("="*70)
        print(f"Total files modified: {total_files}")
        print(f"Total changes: {total_changes}")
        print("="*70)

        if dry_run:
            print("\n[INFO] DRY RUN MODE - No files were modified")
            print("Run with --apply to write changes\n")
        else:
            print("\n[OK] Migration complete!\n")

        return {
            "files_modified": total_files,
            "total_changes": total_changes,
            "transformations": self.transformations
        }

    def save_report(self, results: Dict, output_file: str = "migration_artifacts/frontend_migration_report.json"):
        """Save migration report to JSON file."""
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2)

        print(f"Migration report saved: {output_path}")


def main():
    """CLI interface for frontend migration."""
    import argparse

    parser = argparse.ArgumentParser(description="Frontend API Path Migration Tool")
    parser.add_argument("--apply", action="store_true",
                       help="Apply changes (default is dry-run)")
    parser.add_argument("--src-dir", default="../src",
                       help="Source directory (default: ../src)")

    args = parser.parse_args()

    migrator = FrontendAPIMigrator(src_dir=args.src_dir)
    results = migrator.migrate_all(dry_run=not args.apply)
    migrator.save_report(results)


if __name__ == "__main__":
    main()
