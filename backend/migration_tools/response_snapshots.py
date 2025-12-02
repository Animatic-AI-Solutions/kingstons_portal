"""
API Response Snapshot Tool
Captures and compares responses from critical financial endpoints.
Ensures IRR calculations and portfolio valuations remain unchanged after migration.
"""
import json
import asyncio
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional
import hashlib
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

# Try to import requests for HTTP mode, fallback to urllib
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    # Use urllib as fallback
    import urllib.request
    import urllib.error


class ResponseSnapshotManager:
    """Capture and compare API response snapshots."""

    # Critical endpoints that MUST produce identical results
    CRITICAL_ENDPOINTS = [
        # Analytics/IRR endpoints
        "/analytics/company/irr",
        "/analytics/dashboard_stats",
        "/analytics/dashboard_all",

        # Client data endpoints
        "/client_groups",
        "/bulk_client_data",

        # Product endpoints
        "/client_products",

        # Portfolio endpoints
        "/portfolios",

        # Fund endpoints
        "/available_funds",
        "/portfolio_funds",

        # Valuation endpoints
        "/portfolio_valuations",
        "/fund_valuations"
    ]

    def __init__(self, snapshot_dir: str = "migration_artifacts/snapshots", base_url: Optional[str] = None):
        self.snapshot_dir = Path(snapshot_dir)
        self.snapshot_dir.mkdir(parents=True, exist_ok=True)
        self.base_url = base_url  # If provided, use HTTP requests instead of TestClient
        self.client = None

    def _get_client(self):
        """Lazy-load test client or return None if using HTTP mode."""
        if self.base_url:
            # Using HTTP requests to running server
            return "HTTP_MODE"

        if self.client is None:
            try:
                from fastapi.testclient import TestClient
                from main import app
                self.client = TestClient(app)
            except Exception as e:
                print(f"Warning: Could not create test client: {e}")
                return None
        return self.client

    def capture_snapshot(self, endpoint: str, params: Optional[Dict] = None,
                        snapshot_name: str = "baseline") -> Optional[Path]:
        """
        Capture response snapshot for an endpoint.

        Args:
            endpoint: API endpoint path (may contain {id} placeholders)
            params: Dictionary of path parameters (e.g., {"id": 1})
            snapshot_name: Name for this snapshot set (e.g., "baseline", "post-migration")

        Returns:
            Path to saved snapshot file or None if capture failed
        """
        client = self._get_client()
        if not client:
            return None

        # Replace path parameters
        test_endpoint = endpoint
        if params:
            for key, value in params.items():
                test_endpoint = test_endpoint.replace(f"{{{key}}}", str(value))

        # Make request
        print(f"Capturing: {test_endpoint}")
        try:
            if client == "HTTP_MODE":
                # Make HTTP request to running server
                url = f"{self.base_url}/api{test_endpoint}"

                if HAS_REQUESTS:
                    # Use requests library
                    resp = requests.get(url, timeout=30)
                    class ResponseAdapter:
                        def __init__(self, r):
                            self.status_code = r.status_code
                            self.text = r.text
                            self.content = r.content
                        def json(self):
                            import json
                            return json.loads(self.text)
                    response = ResponseAdapter(resp)
                else:
                    # Fallback to urllib
                    req = urllib.request.Request(url)
                    try:
                        with urllib.request.urlopen(req, timeout=30) as resp:
                            content = resp.read()
                            class ResponseAdapter:
                                def __init__(self, code, body):
                                    self.status_code = code
                                    self.content = body
                                    self.text = body.decode('utf-8')
                                def json(self):
                                    import json
                                    return json.loads(self.text)
                            response = ResponseAdapter(resp.status, content)
                    except urllib.error.HTTPError as e:
                        class ResponseAdapter:
                            def __init__(self, code, body):
                                self.status_code = code
                                self.content = body
                                self.text = body.decode('utf-8')
                            def json(self):
                                import json
                                return json.loads(self.text)
                        content = e.read()
                        response = ResponseAdapter(e.code, content)
            else:
                # Use TestClient
                response = client.get(test_endpoint)
        except Exception as e:
            print(f"  Error capturing {test_endpoint}: {e}")
            return None

        # Create snapshot data
        snapshot_data = {
            "endpoint": endpoint,
            "test_endpoint": test_endpoint,
            "params": params,
            "timestamp": datetime.now().isoformat(),
            "status_code": response.status_code,
            "response_body": response.json() if response.status_code == 200 else None,
            "error": response.text if response.status_code != 200 else None,
            "content_hash": hashlib.sha256(response.content).hexdigest()
        }

        # Save snapshot
        safe_endpoint_name = endpoint.replace("/", "_").replace("{", "").replace("}", "")
        snapshot_file = self.snapshot_dir / f"{snapshot_name}_{safe_endpoint_name}.json"

        with open(snapshot_file, "w") as f:
            json.dump(snapshot_data, f, indent=2, default=str)

        return snapshot_file

    def capture_all_critical(self, snapshot_name: str = "baseline",
                            test_ids: Optional[Dict[str, int]] = None) -> List[Path]:
        """
        Capture snapshots for all critical endpoints.

        Args:
            snapshot_name: Name for this snapshot set
            test_ids: Dictionary mapping parameter names to test IDs

        Returns:
            List of snapshot file paths
        """
        if test_ids is None:
            test_ids = {"id": 1, "client_group_id": 1}

        snapshot_files = []

        print(f"\nCapturing {len(self.CRITICAL_ENDPOINTS)} critical endpoint snapshots...")
        print(f"Snapshot name: {snapshot_name}")
        print("="*60)

        for endpoint in self.CRITICAL_ENDPOINTS:
            try:
                snapshot_file = self.capture_snapshot(endpoint, test_ids, snapshot_name)
                if snapshot_file:
                    snapshot_files.append(snapshot_file)
                    print(f"  [OK] {endpoint}")
                else:
                    print(f"  [SKIP] {endpoint}")
            except Exception as e:
                print(f"  [ERROR] {endpoint}: {e}")

        print("="*60)
        print(f"[OK] Captured {len(snapshot_files)} snapshots\n")

        return snapshot_files

    def compare_snapshots(self, baseline_name: str = "baseline",
                         comparison_name: str = "post-migration") -> Dict[str, Any]:
        """
        Compare two snapshot sets and report differences.

        Args:
            baseline_name: Name of baseline snapshot set
            comparison_name: Name of comparison snapshot set

        Returns:
            Dictionary containing comparison results
        """
        results = {
            "comparison_timestamp": datetime.now().isoformat(),
            "baseline": baseline_name,
            "comparison": comparison_name,
            "endpoints_compared": 0,
            "identical_responses": 0,
            "differences_found": 0,
            "errors": [],
            "details": []
        }

        print(f"\nComparing snapshots: {baseline_name} vs {comparison_name}")
        print("="*60)

        # Find all baseline snapshots
        baseline_files = list(self.snapshot_dir.glob(f"{baseline_name}_*.json"))

        for baseline_file in baseline_files:
            # Find corresponding comparison file
            comparison_filename = baseline_file.name.replace(baseline_name, comparison_name)
            comparison_file = self.snapshot_dir / comparison_filename

            if not comparison_file.exists():
                results["errors"].append({
                    "endpoint": baseline_file.stem,
                    "error": "Comparison snapshot not found"
                })
                continue

            # Load snapshots
            with open(baseline_file) as f:
                baseline_data = json.load(f)
            with open(comparison_file) as f:
                comparison_data = json.load(f)

            results["endpoints_compared"] += 1
            endpoint = baseline_data["endpoint"]

            # Compare
            comparison_detail = {
                "endpoint": endpoint,
                "status_match": baseline_data["status_code"] == comparison_data["status_code"],
                "content_hash_match": baseline_data["content_hash"] == comparison_data["content_hash"]
            }

            # Check for differences
            if not comparison_detail["content_hash_match"]:
                # Try to identify what changed
                try:
                    baseline_json = json.dumps(baseline_data["response_body"], sort_keys=True)
                    comparison_json = json.dumps(comparison_data["response_body"], sort_keys=True)

                    if baseline_json == comparison_json:
                        # Same content, different whitespace/ordering
                        comparison_detail["content_hash_match"] = True
                        results["identical_responses"] += 1
                        print(f"  [OK] {endpoint}: identical")
                    else:
                        comparison_detail["differences"] = "Content differs"
                        results["differences_found"] += 1
                        print(f"  [DIFF] {endpoint}: DIFFERENCES DETECTED")
                except:
                    results["differences_found"] += 1
                    print(f"  [DIFF] {endpoint}: DIFFERENCES DETECTED")
            else:
                results["identical_responses"] += 1
                print(f"  [OK] {endpoint}: identical")

            results["details"].append(comparison_detail)

        print("="*60)
        print(f"Results: {results['identical_responses']}/{results['endpoints_compared']} identical")

        if results["differences_found"] > 0:
            print(f"[WARNING] {results['differences_found']} endpoints have differences!")
        else:
            print("[OK] All responses identical - migration successful!")

        # Save comparison report
        report_file = self.snapshot_dir / f"comparison_{baseline_name}_vs_{comparison_name}.json"
        with open(report_file, "w") as f:
            json.dump(results, f, indent=2, default=str)

        print(f"\nComparison report saved: {report_file}\n")

        return results


def main():
    """CLI interface for snapshot tool."""
    import argparse

    parser = argparse.ArgumentParser(description="API Response Snapshot Tool")
    parser.add_argument("command", choices=["capture", "compare"],
                       help="Command to execute")
    parser.add_argument("--name", default="baseline",
                       help="Snapshot name (default: baseline)")
    parser.add_argument("--baseline", default="baseline",
                       help="Baseline snapshot name for comparison")
    parser.add_argument("--comparison", default="post-migration",
                       help="Comparison snapshot name")
    parser.add_argument("--client-group-id", type=int, default=1,
                       help="Test client group ID")
    parser.add_argument("--base-url", default=None,
                       help="Base URL of running backend (e.g., http://127.0.0.1:8001)")

    args = parser.parse_args()

    manager = ResponseSnapshotManager(base_url=args.base_url)

    if args.command == "capture":
        manager.capture_all_critical(
            snapshot_name=args.name,
            test_ids={"id": args.client_group_id, "client_group_id": args.client_group_id}
        )
    elif args.command == "compare":
        results = manager.compare_snapshots(
            baseline_name=args.baseline,
            comparison_name=args.comparison
        )

        # Exit with error code if differences found
        if results["differences_found"] > 0:
            sys.exit(1)


if __name__ == "__main__":
    main()
