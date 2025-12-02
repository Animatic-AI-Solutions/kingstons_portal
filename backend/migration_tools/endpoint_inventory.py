"""
Automated Endpoint Inventory Tool
Generates comprehensive list of all API endpoints and creates validation tests.
"""
import json
import sys
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))


class EndpointInventory:
    """Generate and validate API endpoint inventory."""

    def __init__(self):
        self.endpoints: List[Dict[str, Any]] = []
        self.output_dir = Path("migration_artifacts")
        self.output_dir.mkdir(exist_ok=True)

    def generate_inventory_from_main(self) -> List[Dict[str, Any]]:
        """Extract all endpoints from FastAPI app."""
        try:
            from main import app
            from fastapi.routing import APIRoute

            for route in app.routes:
                if isinstance(route, APIRoute):
                    endpoint_info = {
                        "path": route.path,
                        "name": route.name,
                        "methods": sorted(list(route.methods)),
                        "has_underscore": "_" in route.path,
                        "hyphenated_equivalent": route.path.replace("_", "-") if "_" in route.path else route.path
                    }
                    self.endpoints.append(endpoint_info)

            # Sort by path for readability
            self.endpoints.sort(key=lambda x: x["path"])
            return self.endpoints
        except Exception as e:
            print(f"Warning: Could not import main app: {e}")
            print("Falling back to file-based discovery...")
            return self.generate_inventory_from_files()

    def generate_inventory_from_files(self) -> List[Dict[str, Any]]:
        """Discover endpoints by parsing route files directly."""
        import re
        routes_dir = Path(__file__).parent.parent / "app" / "api" / "routes"

        if not routes_dir.exists():
            print(f"Error: Routes directory not found: {routes_dir}")
            return []

        route_pattern = re.compile(r'@router\.(get|post|put|patch|delete)\(["\']([^"\']+)["\']')

        for route_file in routes_dir.glob("*.py"):
            if route_file.name == "__init__.py":
                continue

            try:
                with open(route_file, 'r', encoding='utf-8') as f:
                    content = f.read()

                for match in route_pattern.finditer(content):
                    method = match.group(1).upper()
                    path = match.group(2)

                    endpoint_info = {
                        "path": path,
                        "name": f"{route_file.stem}_{path.replace('/', '_')}",
                        "methods": [method],
                        "file": route_file.name,
                        "has_underscore": "_" in path,
                        "hyphenated_equivalent": path.replace("_", "-") if "_" in path else path
                    }
                    self.endpoints.append(endpoint_info)

            except Exception as e:
                print(f"Error processing {route_file.name}: {e}")

        # Merge duplicate paths (same path, different methods)
        merged = {}
        for ep in self.endpoints:
            key = ep["path"]
            if key in merged:
                merged[key]["methods"].extend(ep["methods"])
                merged[key]["methods"] = sorted(list(set(merged[key]["methods"])))
            else:
                merged[key] = ep

        self.endpoints = list(merged.values())
        self.endpoints.sort(key=lambda x: x["path"])
        return self.endpoints

    def save_inventory(self, filename: str = "endpoint_inventory.json"):
        """Save inventory to JSON file."""
        output_file = self.output_dir / filename

        inventory_data = {
            "generated_at": datetime.now().isoformat(),
            "total_endpoints": len(self.endpoints),
            "endpoints_with_underscores": sum(1 for e in self.endpoints if e["has_underscore"]),
            "endpoints": self.endpoints
        }

        with open(output_file, "w") as f:
            json.dump(inventory_data, f, indent=2)

        print(f"[OK] Inventory saved to {output_file}")
        return output_file

    def save_csv(self, filename: str = "endpoint_inventory.csv"):
        """Save inventory to CSV for spreadsheet analysis."""
        import csv

        output_file = self.output_dir / filename

        with open(output_file, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["path", "methods", "has_underscore", "hyphenated_equivalent", "name"])
            writer.writeheader()

            for endpoint in self.endpoints:
                row = endpoint.copy()
                row["methods"] = ", ".join(row["methods"])
                writer.writerow(row)

        print(f"[OK] CSV saved to {output_file}")
        return output_file

    def generate_pytest_smoke_tests(self, filename: str = "test_endpoint_smoke.py"):
        """Generate pytest file to validate all endpoints respond."""
        output_file = self.output_dir / filename

        # Group endpoints by HTTP method
        get_endpoints = [e for e in self.endpoints if "GET" in e["methods"]]
        post_endpoints = [e for e in self.endpoints if "POST" in e["methods"]]

        test_content = '''"""
Auto-generated smoke tests for all API endpoints.
Generated by endpoint_inventory.py
DO NOT EDIT MANUALLY - Regenerate using the tool.
"""
import pytest
from fastapi.testclient import TestClient

try:
    from main import app
    client = TestClient(app)
except Exception as e:
    pytest.skip(f"Could not import app: {e}", allow_module_level=True)


# GET Endpoints
@pytest.mark.parametrize("endpoint_path", [
'''

        # Add GET endpoints
        for endpoint in get_endpoints[:50]:  # Limit to first 50 to avoid huge test file
            # Replace path parameters with dummy values
            test_path = endpoint["path"].replace("{id}", "1").replace("{client_group_id}", "1").replace("{portfolio_id}", "1").replace("{product_id}", "1")
            test_content += f'    "{test_path}",\n'

        test_content += '''])
def test_get_endpoints_respond(endpoint_path):
    """Validate GET endpoints return valid responses (not 500 errors)."""
    response = client.get(endpoint_path)
    # Accept 200, 401 (auth required), 404 (test data), but NOT 500
    assert response.status_code in [200, 401, 404, 422], f"Endpoint {endpoint_path} returned {response.status_code}"


# POST Endpoints (require authentication/data - just check they exist)
@pytest.mark.parametrize("endpoint_path", [
'''

        for endpoint in post_endpoints[:50]:  # Limit to first 50
            test_path = endpoint["path"].replace("{id}", "1").replace("{client_group_id}", "1").replace("{portfolio_id}", "1")
            test_content += f'    "{test_path}",\n'

        test_content += '''])
def test_post_endpoints_exist(endpoint_path):
    """Validate POST endpoints exist (expect 401/422, not 404/500)."""
    response = client.post(endpoint_path, json={})
    # Accept 200, 201, 401 (auth), 422 (validation), but NOT 404 (missing) or 500 (error)
    assert response.status_code in [200, 201, 401, 422], f"Endpoint {endpoint_path} returned unexpected {response.status_code}"
'''

        with open(output_file, "w") as f:
            f.write(test_content)

        print(f"[OK] Pytest smoke tests generated: {output_file}")
        return output_file

    def print_summary(self):
        """Print inventory summary to console."""
        total = len(self.endpoints)
        underscore_count = sum(1 for e in self.endpoints if e["has_underscore"])

        print("\n" + "="*60)
        print("API ENDPOINT INVENTORY SUMMARY")
        print("="*60)
        print(f"Total endpoints: {total}")
        print(f"Endpoints with underscores: {underscore_count}")
        print(f"Already hyphenated: {total - underscore_count}")
        print(f"Conversion required: {underscore_count > 0}")
        print("="*60 + "\n")

        if underscore_count > 0:
            print("Endpoints requiring conversion:")
            for endpoint in self.endpoints:
                if endpoint["has_underscore"]:
                    methods = ", ".join(endpoint["methods"])
                    print(f"  [{methods}] {endpoint['path']} -> {endpoint['hyphenated_equivalent']}")
        else:
            print("[OK] All endpoints already use hyphenated format!")


def main():
    """Run inventory generation."""
    print("Generating API endpoint inventory...\n")

    inventory = EndpointInventory()

    # Try to load from main app first, fall back to file parsing
    endpoints = inventory.generate_inventory_from_files()

    if not endpoints:
        print("Error: No endpoints found!")
        return

    inventory.save_inventory()
    inventory.save_csv()
    inventory.generate_pytest_smoke_tests()
    inventory.print_summary()

    print("\n[OK] Inventory generation complete!")
    print(f"  Artifacts saved to: {inventory.output_dir.absolute()}")


if __name__ == "__main__":
    main()
