
from migration_tools.response_snapshots import ResponseSnapshotManager
import json

# Create manager with base URL
manager = ResponseSnapshotManager(base_url="http://127.0.0.1:8001")

# Capture using hyphenated paths (the actual new routes)
hyphenated_endpoints = [
    "/analytics/company/irr",
    "/analytics/dashboard-stats",
    "/analytics/dashboard-all",
    "/client-groups",
    "/bulk_client_data",  # This might not exist as standalone
    "/client-products",
    "/portfolios",
    "/available_funds",
    "/portfolio-funds",
    "/portfolio-valuations",
    "/fund-valuations"
]

print("Testing hyphenated endpoints...")
for endpoint in hyphenated_endpoints:
    snapshot = manager.capture_snapshot(endpoint, snapshot_name="post-migration-hyphenated")
    if snapshot:
        print(f"  [OK] {endpoint}")
    else:
        print(f"  [FAIL] {endpoint}")
