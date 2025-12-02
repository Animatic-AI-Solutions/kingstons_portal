"""Middleware package for Kingston's Portal."""
from .path_compatibility import DualPathMiddleware, get_middleware_config

__all__ = ["DualPathMiddleware", "get_middleware_config"]
