import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { getActiveTemplatePortfolioGenerations } from '../services/api';
import { getProviderColor } from '../services/providerColors';
import { FilterSearch } from '../components/ui';
import { ActionButton } from '../components/ui';
import { getProductOwnerDisplayName } from '../utils/productOwnerUtils';
import { StatCard, StatBox, Skeleton } from '../components/ui';
import StandardTable, { ColumnConfig } from '../components/StandardTable';

interface Product {
  id: number;
  client_id: number;
  client_name: string;
  product_name: string;
  status: string;
  start_date: string;
  end_date?: string;
  irr?: number;
  irr_date?: string | null;
  total_value?: number;
  provider_name?: string;
  provider_id?: number;
  provider_theme_color?: string;
  portfolio_name?: string;
  product_type?: string;
  plan_number?: string;
  is_bespoke?: boolean;
  template_generation_id?: number;
  template_info?: {
    id: number;
    generation_name: string;
    name?: string;
  };
  portfolio_type_display?: string;
  target_risk?: number;
  portfolio_id?: number;
  notes?: string;
  product_owners?: Array<{id: number, firstname?: string, surname?: string, known_as?: string, type?: string}>;
  current_portfolio?: {
    id: number;
    portfolio_name: string;
    assignment_start_date: string;
  };
}



const Products: React.FC = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTemplateGenerations, setActiveTemplateGenerations] = useState<{generation_name: string}[]>([]);



  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching products data with optimized endpoint...");
      
      const productsWithOwnersRes = await api.get('/client_products_with_owners');
      
      // Set products directly from the optimized endpoint response
      const productsData = productsWithOwnersRes.data || [];
      
      // Log summary for debugging
      console.log(`Received ${productsData.length} products with portfolio type information`);
      if (productsData.length > 0) {
        const sampleProduct = productsData[0];
        console.log('Sample product:', {
          id: sampleProduct.id,
          name: sampleProduct.product_name,
          client: sampleProduct.client_name,
          portfolioType: sampleProduct.portfolio_type_display,
          ownerCount: sampleProduct.product_owners?.length || 0
        });
      }
      
      setProducts(productsData);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch products');
      console.error('Error fetching products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActiveTemplateGenerations = async () => {
    try {
      console.log("Fetching active template portfolio generations...");
      const response = await getActiveTemplatePortfolioGenerations();
      console.log("Active template generations response:", response.data);
      setActiveTemplateGenerations(response.data || []);
    } catch (err: any) {
      console.error('Error fetching active template generations:', err);
    }
  };

  useEffect(() => {
    fetchActiveTemplateGenerations();
    fetchProducts();
  }, [api]);

  // Configure table columns for ultra-compact display
  const tableColumns: ColumnConfig[] = [
    {
      key: 'product_name',
      label: 'Product',
      dataType: 'text',
      alignment: 'left',
      control: 'sort',
      width: 'fixed'
    },
    {
      key: 'provider_name',
      label: 'Prov.',
      dataType: 'provider',
      alignment: 'left',
      control: 'filter',
      width: 'fixed'
    },
    {
      key: 'product_owners',
      label: 'Owners',
      dataType: 'text',
      alignment: 'left',
      control: 'none',
      width: 'fixed',
      format: (value: any) => {
        if (value && value.length > 0) {
          if (value.length === 1) {
            return (
              <div className="text-xs text-gray-600">
                {getProductOwnerDisplayName(value[0])}
              </div>
            );
          } else {
            const names = value.slice(0, 2).map((owner: any) => getProductOwnerDisplayName(owner));
            const additional = value.length > 2 ? `+${value.length - 2}` : '';
            return (
              <div className="text-xs text-gray-600">
                {names.join(' • ') + (additional ? ` • ${additional}` : '')}
              </div>
            );
          }
        }
        return <div className="text-xs text-gray-500">N/A</div>;
      }
    },
    {
      key: 'portfolio_type_display',
      label: 'Port.',
      dataType: 'category',
      alignment: 'left',
      control: 'filter',
      width: 'fixed'
    },
    {
      key: 'total_value',
      label: 'Value',
      dataType: 'currency',
      alignment: 'right',
      control: 'sort',
      width: 'fixed'
    },
    {
      key: 'irr',
      label: 'IRR',
      dataType: 'text',
      alignment: 'right',
      control: 'sort',
      width: 'fixed',
      format: (value: any, row: any) => {
        if (value !== undefined && value !== null && typeof value === 'number') {
          const irrPercentage = `${value.toFixed(1)}%`;
          const irrDate = row.irr_date ? new Date(row.irr_date).toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric' }) : null;
          
          return (
            <div className="text-right">
              <div className={`text-xs font-medium ${value >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {irrPercentage}
              </div>
              {irrDate && (
                <div className="text-[10px] text-gray-500 mt-0">
                  {irrDate}
                </div>
              )}
            </div>
          );
        }
        return <div className="text-xs text-gray-500">-</div>;
      }
    }
  ];

  // Process data for the table
  const processedData = useMemo(() => {
    return products.map(product => ({
      ...product,
      client_name: product.client_name || 'N/A',
      product_type: product.product_type || 'N/A',
      provider_name: product.provider_name || 'N/A',
      portfolio_type_display: product.portfolio_type_display || 'Bespoke'
    }));
  }, [products]);

  // Apply search filter
  const filteredData = useMemo(() => {
    if (!searchQuery) return processedData;
    
    const query = searchQuery.toLowerCase();
    return processedData.filter(product => 
      product.product_name?.toLowerCase().includes(query) ||
      product.client_name?.toLowerCase().includes(query) ||
      product.provider_name?.toLowerCase().includes(query) ||
      product.status?.toLowerCase().includes(query) ||
      product.portfolio_type_display?.toLowerCase().includes(query) ||
      product.product_owners?.some(owner => getProductOwnerDisplayName(owner).toLowerCase().includes(query))
    );
  }, [processedData, searchQuery]);

  // Final filtered data is just the search-filtered data since StandardTable handles its own filtering
  const finalFilteredData = filteredData;

  const handleProductClick = (product: Product) => {
    navigate(`/products/${product.id}`, {
      state: {
        from: {
          pathname: '/products',
          label: 'Products'
        }
      }
    });
  };

  const handleCreateClientGroupProducts = () => {
    navigate(`/create-client-group-products?returnTo=${encodeURIComponent('/products')}`);
  };



  return (
    <div className="container mx-auto px-4 py-3">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Products</h1>
        <div className="flex items-center gap-4">
          <ActionButton
            variant="add"
            size="md"
            context="Client Group Products"
            design="descriptive"
            onClick={handleCreateClientGroupProducts}
          />
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-4 overflow-visible">
        {/* Search Control */}
        <div className="flex flex-col gap-3 mb-2">
          {/* Search Bar */}
          <div className="flex-1">
            <FilterSearch
              placeholder="Filter products by name, client, provider, or status..."
              onFilter={setSearchQuery}
              showResultCount={true}
              resultCount={finalFilteredData.length}
              filterLabel="Product"
            />
          </div>
        </div>

        {/* Products Table */}
        <div className="mt-2">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="text-red-600 text-center py-4">{error}</div>
          ) : (
            <StandardTable
              data={finalFilteredData}
              columns={tableColumns}
              className="compact-products-table text-xs"
              maxWidth={900}
              minFontSize={7}
              onRowClick={(row) => handleProductClick(row)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Products;
