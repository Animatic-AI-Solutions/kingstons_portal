"""
Startup Sequence Check
Add this to your main.py to automatically check sequences on application startup
"""

import logging
from app.utils.sequence_manager_new import sequence_manager

logger = logging.getLogger(__name__)

async def startup_sequence_check():
    """
    Check critical sequences on application startup
    This should be added to FastAPI's startup event
    """
    logger.info("🔍 Checking database sequences on startup...")
    
    try:
        # Quick check of critical sequences
        sequences_ok = await sequence_manager.check_critical_sequences()
        
        if sequences_ok:
            logger.info("✅ All critical sequences are synchronized")
        else:
            logger.warning("⚠️ Sequence drift detected! Running full check...")
            
            # Run full check with auto-fix
            results = await sequence_manager.check_sequences(auto_fix=True)
            
            if results['fixed'] > 0:
                logger.info(f"✅ Fixed {results['fixed']} sequence(s) automatically")
            
            if results['errors']:
                logger.error(f"❌ Errors during sequence check: {results['errors']}")
                
    except Exception as e:
        logger.error(f"❌ Failed to check sequences on startup: {e}")
        # Don't fail the entire application startup for sequence issues
        # But log it prominently so it can be addressed

# Example integration for main.py:
"""
Add this to your main.py:

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Application startup")
    await startup_sequence_check()  # Add this line
    yield
    # Shutdown
    logger.info("🛑 Application shutdown")

app = FastAPI(lifespan=lifespan)
"""