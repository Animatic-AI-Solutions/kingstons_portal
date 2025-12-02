"""
Dual-Path Compatibility Middleware
Accepts both underscore and hyphen path formats during migration period.
"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import logging
import os
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)


class DualPathMiddleware(BaseHTTPMiddleware):
    """
    Middleware to support both underscore and hyphen API paths simultaneously.

    Features:
    - Rewrites underscore paths to hyphen format internally
    - Logs path format usage for migration tracking
    - Feature flag to disable old format support
    - Zero impact on response content or status codes
    """

    def __init__(self, app, enable_legacy_paths: bool = True, log_usage: bool = True):
        super().__init__(app)
        self.enable_legacy_paths = enable_legacy_paths
        self.log_usage = log_usage
        self.usage_log_file = "migration_artifacts/path_usage_log.jsonl"

        # Ensure log directory exists
        os.makedirs("migration_artifacts", exist_ok=True)

    async def dispatch(self, request: Request, call_next) -> Response:
        original_path = request.url.path
        modified_path = None
        path_format = "hyphenated"  # Default assumption

        # Check if path contains underscores (legacy format)
        if "_" in original_path:
            path_format = "underscore"

            if not self.enable_legacy_paths:
                # Legacy paths disabled - return 404 with helpful message
                from fastapi.responses import JSONResponse
                return JSONResponse(
                    status_code=404,
                    content={
                        "detail": "This endpoint path format is no longer supported. Please use hyphenated paths (e.g., /client-groups instead of /client_groups).",
                        "deprecated_path": original_path,
                        "suggested_path": self._convert_to_hyphenated(original_path)
                    }
                )

            # Convert underscore to hyphen
            modified_path = self._convert_to_hyphenated(original_path)

            # Modify the request scope to use hyphenated path
            request.scope["path"] = modified_path

            if self.log_usage:
                self._log_path_usage(original_path, modified_path, request)

        # Process request
        response = await call_next(request)

        # Add custom header indicating path conversion occurred
        if modified_path:
            response.headers["X-Path-Converted"] = "true"
            response.headers["X-Original-Path-Format"] = "underscore"

        return response

    def _convert_to_hyphenated(self, path: str) -> str:
        """
        Convert underscore paths to hyphenated format.

        Examples:
        - /api/client_groups -> /api/client-groups
        - /api/product_owners/123 -> /api/product-owners/123
        - /api/bulk_client_data -> /api/bulk-client-data
        """
        # Split path into segments
        segments = path.split("/")

        # Convert each segment
        converted_segments = []
        for segment in segments:
            # Skip empty segments and numeric IDs
            if not segment or segment.isdigit():
                converted_segments.append(segment)
            else:
                # Replace underscores with hyphens
                converted_segments.append(segment.replace("_", "-"))

        return "/".join(converted_segments)

    def _log_path_usage(self, original_path: str, converted_path: str, request: Request):
        """Log path usage for migration tracking."""
        try:
            import json
            log_entry = {
                "timestamp": datetime.utcnow().isoformat(),
                "original_path": original_path,
                "converted_path": converted_path,
                "method": request.method,
                "client_ip": request.client.host if request.client else "unknown",
                "user_agent": request.headers.get("user-agent", "unknown")
            }

            with open(self.usage_log_file, "a") as f:
                f.write(json.dumps(log_entry) + "\n")
        except Exception as e:
            logger.warning(f"Failed to log path usage: {e}")


def get_middleware_config() -> dict:
    """
    Get middleware configuration from environment variables.

    Environment variables:
    - ENABLE_LEGACY_API_PATHS: true/false (default: true)
    - LOG_API_PATH_USAGE: true/false (default: true)
    """
    return {
        "enable_legacy_paths": os.getenv("ENABLE_LEGACY_API_PATHS", "true").lower() == "true",
        "log_usage": os.getenv("LOG_API_PATH_USAGE", "true").lower() == "true"
    }
