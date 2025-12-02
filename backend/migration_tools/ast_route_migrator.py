"""
AST-Based Route Path Migration Script
Automatically converts underscore paths to hyphenated format in FastAPI route files.
Uses Python AST parsing to ensure safe, accurate transformations.
"""
import ast
import sys
from pathlib import Path
from typing import List, Dict, Tuple
import re


class RoutePathMigrator(ast.NodeTransformer):
    """AST transformer to convert underscore paths to hyphenated format."""

    def __init__(self):
        self.transformations: List[Dict] = []
        self.current_file: str = ""

    def visit_FunctionDef(self, node: ast.FunctionDef) -> ast.FunctionDef:
        """Visit function definitions looking for route decorators."""
        for decorator in node.decorator_list:
            self._process_decorator(decorator, node)

        return self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> ast.AsyncFunctionDef:
        """Visit async function definitions looking for route decorators."""
        for decorator in node.decorator_list:
            self._process_decorator(decorator, node)

        return self.generic_visit(node)

    def _process_decorator(self, decorator: ast.AST, func_node: ast.FunctionDef):
        """Process route decorators (e.g., @router.get("/path"))."""
        # Handle @router.get("/path") pattern
        if isinstance(decorator, ast.Call):
            # Check if it's a route decorator (get, post, put, delete, etc.)
            if isinstance(decorator.func, ast.Attribute):
                method_name = decorator.func.attr
                if method_name in ["get", "post", "put", "delete", "patch"]:
                    self._update_path_argument(decorator, func_node)

    def _update_path_argument(self, call_node: ast.Call, func_node: ast.FunctionDef):
        """Update the path argument in route decorator."""
        # Path is typically the first positional argument
        if call_node.args:
            path_arg = call_node.args[0]
            if isinstance(path_arg, ast.Constant) and isinstance(path_arg.value, str):
                original_path = path_arg.value

                # Convert underscores to hyphens
                if "_" in original_path:
                    converted_path = self._convert_path(original_path)

                    # Record transformation
                    self.transformations.append({
                        "file": self.current_file,
                        "function": func_node.name,
                        "line": path_arg.lineno,
                        "original": original_path,
                        "converted": converted_path
                    })

                    # Update AST node
                    path_arg.value = converted_path

    def _convert_path(self, path: str) -> str:
        """
        Convert underscore path to hyphenated format.
        Preserves path parameters like {id}.
        """
        segments = path.split("/")
        converted_segments = []

        for segment in segments:
            # Skip empty segments
            if not segment:
                converted_segments.append(segment)
                continue

            # Preserve path parameters {id}, {client_group_id}, etc.
            if segment.startswith("{") and segment.endswith("}"):
                # Convert parameter name inside braces
                param_name = segment[1:-1]
                converted_param = param_name.replace("_", "-")
                converted_segments.append(f"{{{converted_param}}}")
            else:
                # Convert regular segments
                converted_segments.append(segment.replace("_", "-"))

        return "/".join(converted_segments)


class RouteMigrationOrchestrator:
    """Orchestrate migration across all route files."""

    def __init__(self, routes_dir: Path):
        self.routes_dir = routes_dir
        self.migration_report: List[Dict] = []

    def migrate_all_routes(self, dry_run: bool = True) -> List[Dict]:
        """
        Migrate all route files in the directory.

        Args:
            dry_run: If True, show changes without writing files

        Returns:
            List of transformation dictionaries
        """
        route_files = list(self.routes_dir.glob("*.py"))

        print(f"\nFound {len(route_files)} route files to process")
        print("="*60)

        for route_file in route_files:
            if route_file.name == "__init__.py":
                continue

            print(f"\nProcessing: {route_file.name}")
            transformations = self._migrate_file(route_file, dry_run)

            if transformations:
                print(f"  [OK] {len(transformations)} paths converted")
                self.migration_report.extend(transformations)
            else:
                print(f"  - No underscore paths found")

        print("\n" + "="*60)
        print(f"Total transformations: {len(self.migration_report)}")

        if dry_run:
            print("\n[INFO] DRY RUN MODE - No files were modified")
            print("Run with --apply to write changes")
        else:
            print("\n[OK] Files have been updated")

        return self.migration_report

    def _migrate_file(self, file_path: Path, dry_run: bool) -> List[Dict]:
        """Migrate a single route file."""
        # Read source code
        with open(file_path, "r", encoding="utf-8") as f:
            source_code = f.read()

        # Parse AST
        try:
            tree = ast.parse(source_code)
        except SyntaxError as e:
            print(f"  [ERROR] Syntax error: {e}")
            return []

        # Transform AST
        migrator = RoutePathMigrator()
        migrator.current_file = file_path.name
        new_tree = migrator.visit(tree)

        # Generate new source code if transformations were made
        if migrator.transformations:
            # Use ast.unparse for Python 3.9+
            try:
                new_source = ast.unparse(new_tree)
            except AttributeError:
                # Fallback for older Python versions
                print(f"  [WARNING] ast.unparse not available, using simple replacement")
                new_source = self._simple_replacement(source_code, migrator.transformations)

            if not dry_run:
                # Write updated file
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(new_source)
            else:
                # Show preview of changes
                for trans in migrator.transformations:
                    print(f"    Line {trans['line']}: {trans['original']} -> {trans['converted']}")

        return migrator.transformations

    def _simple_replacement(self, source_code: str, transformations: List[Dict]) -> str:
        """Fallback: simple string replacement for transformations."""
        modified_source = source_code
        for trans in transformations:
            # Be careful with replacements to avoid double-replacement
            old_decorator = f'"{trans["original"]}"'
            new_decorator = f'"{trans["converted"]}"'
            modified_source = modified_source.replace(old_decorator, new_decorator, 1)

            # Also try single quotes
            old_decorator = f"'{trans['original']}'"
            new_decorator = f"'{trans['converted']}'"
            modified_source = modified_source.replace(old_decorator, new_decorator, 1)

        return modified_source

    def save_report(self, output_file: Path):
        """Save migration report to JSON."""
        import json

        report_data = {
            "migration_timestamp": datetime.now().isoformat() if 'datetime' in dir() else "unknown",
            "total_transformations": len(self.migration_report),
            "files_modified": len(set(t["file"] for t in self.migration_report)),
            "transformations": self.migration_report
        }

        with open(output_file, "w") as f:
            json.dump(report_data, f, indent=2)

        print(f"\n[OK] Migration report saved: {output_file}")


def main():
    """CLI interface for route migration."""
    import argparse
    from datetime import datetime

    parser = argparse.ArgumentParser(
        description="AST-based route path migration tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry run (preview changes)
  python ast_route_migrator.py --routes-dir ../app/api/routes

  # Apply changes
  python ast_route_migrator.py --routes-dir ../app/api/routes --apply

  # Save report
  python ast_route_migrator.py --routes-dir ../app/api/routes --apply --report migration_report.json
        """
    )

    parser.add_argument(
        "--routes-dir",
        type=Path,
        default=Path(__file__).parent.parent / "app" / "api" / "routes",
        help="Directory containing route files"
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply changes (default is dry-run)"
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=Path("migration_artifacts/ast_migration_report.json"),
        help="Output file for migration report"
    )

    args = parser.parse_args()

    if not args.routes_dir.exists():
        print(f"Error: Routes directory not found: {args.routes_dir}")
        sys.exit(1)

    # Run migration
    orchestrator = RouteMigrationOrchestrator(args.routes_dir)
    dry_run = not args.apply

    print("\n" + "="*60)
    print("AST-BASED ROUTE PATH MIGRATION")
    print("="*60)
    print(f"Routes directory: {args.routes_dir}")
    print(f"Mode: {'DRY RUN' if dry_run else 'APPLY CHANGES'}")

    transformations = orchestrator.migrate_all_routes(dry_run=dry_run)

    # Save report
    if transformations:
        orchestrator.save_report(args.report)

    # Summary by file
    if transformations:
        print("\n" + "="*60)
        print("TRANSFORMATIONS BY FILE")
        print("="*60)

        by_file = {}
        for trans in transformations:
            by_file.setdefault(trans["file"], []).append(trans)

        for filename, file_trans in sorted(by_file.items()):
            print(f"\n{filename} ({len(file_trans)} changes):")
            for trans in file_trans[:5]:  # Show first 5 per file
                print(f"  Line {trans['line']}: {trans['original']} -> {trans['converted']}")
            if len(file_trans) > 5:
                print(f"  ... and {len(file_trans) - 5} more")


if __name__ == "__main__":
    main()
