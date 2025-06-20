import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from functools import wraps
import asyncio

logger = logging.getLogger(__name__)

class IRRCache:
    """
    In-memory cache for IRR calculations to prevent redundant computations.
    
    Cache Key Strategy:
    - Combines portfolio fund IDs, calculation date, and cash flow data
    - Uses SHA256 hash for consistent, collision-resistant keys
    - TTL (Time To Live) prevents stale data
    """
    
    def __init__(self, default_ttl_minutes: int = 30):
        self._cache: Dict[str, Dict] = {}
        self._default_ttl = timedelta(minutes=default_ttl_minutes)
        self._lock = asyncio.Lock()
        
    def _generate_cache_key(self, 
                          portfolio_fund_ids: List[int], 
                          calculation_date: Optional[str] = None,
                          cash_flows: Optional[List[float]] = None,
                          fund_valuations: Optional[Dict[int, float]] = None) -> str:
        """
        Generate a unique cache key for IRR calculation inputs.
        
        Args:
            portfolio_fund_ids: List of portfolio fund IDs involved
            calculation_date: Date used for IRR calculation  
            cash_flows: List of cash flows (optional, for additional uniqueness)
            fund_valuations: Fund valuations dict (optional, for additional uniqueness)
            
        Returns:
            SHA256 hash string to use as cache key
        """
        # Sort fund IDs to ensure consistent ordering
        sorted_fund_ids = sorted(portfolio_fund_ids)
        
        # Create cache key components
        key_data = {
            'fund_ids': sorted_fund_ids,
            'calculation_date': calculation_date or 'latest',
            'cash_flows': cash_flows or [],
            'fund_valuations': fund_valuations or {}
        }
        
        # Convert to JSON string and hash
        key_string = json.dumps(key_data, sort_keys=True)
        cache_key = hashlib.sha256(key_string.encode()).hexdigest()
        
        return cache_key
    
    async def get(self, 
                  portfolio_fund_ids: List[int], 
                  calculation_date: Optional[str] = None,
                  cash_flows: Optional[List[float]] = None,
                  fund_valuations: Optional[Dict[int, float]] = None) -> Optional[Dict]:
        """
        Retrieve cached IRR calculation result.
        
        Returns:
            Cached result dict if found and not expired, None otherwise
        """
        async with self._lock:
            cache_key = self._generate_cache_key(portfolio_fund_ids, calculation_date, cash_flows, fund_valuations)
            
            if cache_key not in self._cache:
                logger.debug(f"IRR cache miss for key: {cache_key[:16]}...")
                return None
            
            cached_item = self._cache[cache_key]
            
            # Check if expired
            if datetime.now() > cached_item['expires_at']:
                logger.debug(f"IRR cache entry expired for key: {cache_key[:16]}...")
                del self._cache[cache_key]
                return None
            
            logger.info(f"✅ IRR cache hit for funds {portfolio_fund_ids} - saved computation!")
            return cached_item['data']
    
    async def set(self, 
                  portfolio_fund_ids: List[int], 
                  result: Dict,
                  calculation_date: Optional[str] = None,
                  cash_flows: Optional[List[float]] = None,
                  fund_valuations: Optional[Dict[int, float]] = None,
                  ttl_minutes: Optional[int] = None) -> None:
        """
        Store IRR calculation result in cache.
        
        Args:
            portfolio_fund_ids: List of portfolio fund IDs involved
            result: IRR calculation result to cache
            calculation_date: Date used for IRR calculation
            cash_flows: List of cash flows (for cache key uniqueness)
            fund_valuations: Fund valuations dict (for cache key uniqueness)
            ttl_minutes: Time to live in minutes (uses default if not provided)
        """
        async with self._lock:
            cache_key = self._generate_cache_key(portfolio_fund_ids, calculation_date, cash_flows, fund_valuations)
            ttl = timedelta(minutes=ttl_minutes or self._default_ttl.total_seconds() / 60)
            
            self._cache[cache_key] = {
                'data': result,
                'created_at': datetime.now(),
                'expires_at': datetime.now() + ttl,
                'fund_ids': portfolio_fund_ids,
                'calculation_date': calculation_date
            }
            
            logger.info(f"💾 IRR result cached for funds {portfolio_fund_ids} (TTL: {ttl_minutes or self._default_ttl.total_seconds() / 60}min)")
    
    async def clear_expired(self) -> int:
        """
        Remove expired cache entries.
        
        Returns:
            Number of entries removed
        """
        async with self._lock:
            now = datetime.now()
            expired_keys = [
                key for key, item in self._cache.items() 
                if now > item['expires_at']
            ]
            
            for key in expired_keys:
                del self._cache[key]
            
            if expired_keys:
                logger.info(f"🧹 Cleared {len(expired_keys)} expired IRR cache entries")
            
            return len(expired_keys)
    
    async def invalidate_portfolio_funds(self, portfolio_fund_ids: List[int]) -> int:
        """
        Invalidate cache entries for specific portfolio funds.
        Useful when fund data changes (new activities, valuations, etc.)
        
        Args:
            portfolio_fund_ids: List of portfolio fund IDs to invalidate
            
        Returns:
            Number of entries invalidated
        """
        async with self._lock:
            # Find cache entries that involve any of the specified funds
            keys_to_remove = []
            
            for key, item in self._cache.items():
                cached_fund_ids = item.get('fund_ids', [])
                if any(fund_id in cached_fund_ids for fund_id in portfolio_fund_ids):
                    keys_to_remove.append(key)
            
            # Remove the entries
            for key in keys_to_remove:
                del self._cache[key]
            
            if keys_to_remove:
                logger.info(f"🗑️ Invalidated {len(keys_to_remove)} IRR cache entries for funds {portfolio_fund_ids}")
            
            return len(keys_to_remove)
    
    def get_cache_stats(self) -> Dict:
        """
        Get cache statistics for monitoring.
        
        Returns:
            Dict with cache size, expired entries, etc.
        """
        now = datetime.now()
        total_entries = len(self._cache)
        expired_entries = sum(1 for item in self._cache.values() if now > item['expires_at'])
        
        return {
            'total_entries': total_entries,
            'active_entries': total_entries - expired_entries,
            'expired_entries': expired_entries,
            'cache_size_bytes': len(str(self._cache)),
            'oldest_entry': min(
                (item['created_at'] for item in self._cache.values()), 
                default=None
            ),
            'newest_entry': max(
                (item['created_at'] for item in self._cache.values()),
                default=None
            )
        }

# Global cache instance
_irr_cache = IRRCache(default_ttl_minutes=30)

def get_irr_cache() -> IRRCache:
    """Get the global IRR cache instance."""
    return _irr_cache

def irr_cached(ttl_minutes: int = 30):
    """
    Decorator for caching IRR calculation functions.
    
    Args:
        ttl_minutes: Time to live for cached results in minutes
        
    Usage:
        @irr_cached(ttl_minutes=30)
        async def calculate_portfolio_irr(fund_ids, date):
            # calculation logic
            return result
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache = get_irr_cache()
            
            # Extract fund IDs from arguments - this is function-specific
            # We'll need to adapt this based on the actual function signature
            portfolio_fund_ids = []
            calculation_date = None
            
            # Try to extract fund IDs from common parameter names
            if 'portfolio_fund_ids' in kwargs:
                portfolio_fund_ids = kwargs['portfolio_fund_ids']
            elif 'fund_ids' in kwargs:
                portfolio_fund_ids = kwargs['fund_ids']
            elif len(args) > 0 and isinstance(args[0], list):
                portfolio_fund_ids = args[0]
            
            # Try to extract calculation date
            if 'irr_date' in kwargs:
                calculation_date = kwargs['irr_date']
            elif 'calculation_date' in kwargs:
                calculation_date = kwargs['calculation_date']
            
            # Check cache first
            if portfolio_fund_ids:
                cached_result = await cache.get(
                    portfolio_fund_ids=portfolio_fund_ids,
                    calculation_date=calculation_date
                )
                
                if cached_result is not None:
                    return cached_result
            
            # Calculate if not cached
            result = await func(*args, **kwargs)
            
            # Cache the result
            if portfolio_fund_ids and result:
                await cache.set(
                    portfolio_fund_ids=portfolio_fund_ids,
                    result=result,
                    calculation_date=calculation_date,
                    ttl_minutes=ttl_minutes
                )
            
            return result
        
        return wrapper
    return decorator 