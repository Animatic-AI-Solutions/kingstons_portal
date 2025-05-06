import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    print("Importing client_product_portfolio_assignment models...")
    from app.models.client_product_portfolio_assignment import (
        ClientproductPortfolioAssignment, 
        ClientproductPortfolioAssignmentCreate, 
        ClientproductPortfolioAssignmentUpdate
    )
    print("✅ Successfully imported client_product_portfolio_assignment models")
    
    print("Importing product_holding models...")
    from app.models.product_holding import (
        ProductHolding, 
        ProductHoldingCreate, 
        ProductHoldingUpdate
    )
    print("✅ Successfully imported product_holding models")
    
    print("Importing client_product models...")
    from app.models.client_product import (
        Clientproduct, 
        ClientproductCreate, 
        ClientproductUpdate
    )
    print("✅ Successfully imported client_product models")
    
    print("All models imported successfully!")
except ImportError as e:
    print(f"❌ Import Error: {e}")
    import traceback
    traceback.print_exc() 