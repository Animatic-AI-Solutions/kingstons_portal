import React, { useState, useMemo, useRef, useEffect } from 'react';
import TableFilter, { FilterOption } from './ui/table-controls/TableFilter';
import TableSort, { SortType, SortDirection } from './ui/table-controls/TableSort';
import { getProviderColor } from '../utils/definitionsShared';

// Types
export interface ColumnConfig {
  key: string;
  label: string;
  dataType?: 'category' | 'text' | 'number' | 'currency' | 'date' | 'percentage' | 'readonly' | 'provider' | 'risk';
  alignment?: 'left' | 'right';
  width?: 'auto' | 'fixed' | number;
  control?: 'filter' | 'sort' | 'none' | 'auto';
  format?: (value: any, row?: any) => string | React.ReactNode;
}

export interface TableSort {
  columnKey: string;
  type: SortType;
  direction: SortDirection;
}

export interface TableFilters {
  [columnKey: string]: (string | number)[];
}

export interface StandardTableProps {
  data: any[];
  columns: ColumnConfig[];
  className?: string;
  maxWidth?: number; // For responsive breakpoint
  minFontSize?: number; // Minimum font size before scroll
  onRowClick?: (row: any, index: number) => void; // Optional row click handler
}

// Data type detection utilities
const detectDataType = (data: any[], columnKey: string): { 
  dataType: ColumnConfig['dataType']; 
  controlType: 'filter' | 'sort' | 'none';
  sortTypes: SortType[];
} => {
  const values = data.map(row => row[columnKey]).filter(v => v != null && v !== '');
  if (values.length === 0) return { dataType: 'readonly', controlType: 'none', sortTypes: [] };

  const uniqueValues = new Set(values);
  const uniqueRatio = uniqueValues.size / values.length;
  
  // Check for currency (contains currency symbols or large numbers)
  const hasCurrency = values.some(v => 
    typeof v === 'string' && /[£$€¥₹]/.test(v) ||
    typeof v === 'number' && v > 1000
  );
  
  // Check for percentages
  const hasPercentage = values.some(v => 
    typeof v === 'string' && v.includes('%') ||
    typeof v === 'number' && v >= 0 && v <= 1
  );
  
  // Check for dates
  const hasDate = values.some(v => {
    if (typeof v === 'string') {
      return !isNaN(Date.parse(v)) || /^\d{4}-\d{2}-\d{2}/.test(v);
    }
    return v instanceof Date;
  });
  
  // Check for numbers
  const hasNumber = values.every(v => 
    typeof v === 'number' || 
    (typeof v === 'string' && !isNaN(parseFloat(v)))
  );

  // Decision logic
  if (hasDate) {
    return { dataType: 'date', controlType: 'sort', sortTypes: ['date'] };
  }
  
  if (hasCurrency) {
    return { dataType: 'currency', controlType: 'sort', sortTypes: ['numerical'] };
  }
  
  if (hasPercentage) {
    return { dataType: 'percentage', controlType: 'sort', sortTypes: ['numerical'] };
  }
  
  if (hasNumber) {
    return { dataType: 'number', controlType: 'sort', sortTypes: ['numerical'] };
  }
  
  // For text/string data
  if (uniqueRatio < 0.3 && uniqueValues.size <= 10) {
    // Low unique ratio suggests categorical data - use filter
    return { dataType: 'category', controlType: 'filter', sortTypes: [] };
  }
  
  // High unique ratio suggests varied text - use sort
  return { dataType: 'text', controlType: 'sort', sortTypes: ['alphabetical'] };
};

// Formatting utilities
const formatValue = (value: any, dataType: ColumnConfig['dataType'], customFormat?: (value: any, row?: any) => string | React.ReactNode, rowData?: any): React.ReactNode => {
  if (customFormat) return customFormat(value, rowData);
  if (value == null) return '';
  
  switch (dataType) {
    case 'currency':
      if (typeof value === 'number') {
        return new Intl.NumberFormat('en-GB', {
          style: 'currency',
          currency: 'GBP',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      }
      return value.toString();
    
    case 'percentage':
      if (typeof value === 'number') {
        return `${(value * 100).toFixed(1)}%`;
      }
      return value.toString();
    
    case 'number':
      if (typeof value === 'number') {
        return value.toLocaleString();
      }
      return value.toString();
    
    case 'date':
      if (value instanceof Date || !isNaN(Date.parse(value))) {
        return new Date(value).toLocaleDateString('en-GB');
      }
      return value.toString();
    
    case 'category':
      // Add badge styling for categories/status like client groups table
      const categoryValue = value.toString().toLowerCase();
      
      // Status styling
      const statusColors: Record<string, string> = {
        'active': 'bg-green-100 text-green-800',
        'inactive': 'bg-gray-100 text-gray-800',
        'dormant': 'bg-gray-100 text-gray-800',
        'pending': 'bg-yellow-100 text-yellow-800',
        'completed': 'bg-green-100 text-green-800',
        'on-hold': 'bg-orange-100 text-orange-800'
      };
      
      if (statusColors[categoryValue]) {
        return React.createElement('span', {
          className: `px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full ${statusColors[categoryValue]}`
        }, value);
      }
      
      // Type styling for other categories (Family, Business, Trust, etc.)
      return React.createElement('span', {
        className: 'px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-blue-100 text-blue-800'
      }, value);
    
    case 'provider':
      // Provider name with color circle
      if (rowData) {
        // Get color from provider_theme_color, theme_color, or generate default color
        const providerColor = rowData.provider_theme_color || rowData.theme_color || getProviderColor(rowData.name || value.toString());
        
        return React.createElement('div', {
          className: 'flex items-center'
        }, [
          React.createElement('div', {
            key: 'circle',
            className: 'h-3 w-3 rounded-full mr-2 flex-shrink-0',
            style: { backgroundColor: providerColor },
            'aria-hidden': 'true'
          }),
          React.createElement('div', {
            key: 'text',
            className: 'text-sm font-medium text-gray-800 font-sans tracking-tight'
          }, value)
        ]);
      }
      return value.toString();
    
    case 'risk':
      // Risk value with color coding - needs access to helper functions from the page
      if (typeof value === 'number') {
        const riskValue = value || 0;
        // Simple color classes without complex logic (page-specific logic should be in format function)
        if (riskValue <= 0) {
          return React.createElement('div', {
            className: 'text-sm font-sans'
          }, React.createElement('div', {
            className: 'text-gray-500 transition-colors duration-200'
          }, 'N/A'));
        } else if (riskValue <= 2) {
          return React.createElement('div', {
            className: 'text-sm font-sans'
          }, React.createElement('div', {
            className: 'text-green-600 font-medium transition-colors duration-200'
          }, riskValue.toFixed(1)));
        } else if (riskValue <= 3) {
          return React.createElement('div', {
            className: 'text-sm font-sans'
          }, React.createElement('div', {
            className: 'text-lime-600 font-medium transition-colors duration-200'
          }, riskValue.toFixed(1)));
        } else if (riskValue <= 4) {
          return React.createElement('div', {
            className: 'text-sm font-sans'
          }, React.createElement('div', {
            className: 'text-yellow-600 font-medium transition-colors duration-200'
          }, riskValue.toFixed(1)));
        } else if (riskValue <= 5) {
          return React.createElement('div', {
            className: 'text-sm font-sans'
          }, React.createElement('div', {
            className: 'text-orange-600 font-medium transition-colors duration-200'
          }, riskValue.toFixed(1)));
        } else if (riskValue <= 6) {
          return React.createElement('div', {
            className: 'text-sm font-sans'
          }, React.createElement('div', {
            className: 'text-red-500 font-medium transition-colors duration-200'
          }, riskValue.toFixed(1)));
        } else {
          return React.createElement('div', {
            className: 'text-sm font-sans'
          }, React.createElement('div', {
            className: 'text-red-600 font-semibold transition-colors duration-200'
          }, riskValue.toFixed(1)));
        }
      }
      return value.toString();
    
    default:
      return value.toString();
  }
};

// Sorting utilities
const sortData = (data: any[], sort: TableSort | null): any[] => {
  if (!sort || !sort.direction) return data;
  
  return [...data].sort((a, b) => {
    const aVal = a[sort.columnKey];
    const bVal = b[sort.columnKey];
    
    // Handle null/undefined values
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    
    let comparison = 0;
    
    switch (sort.type) {
      case 'alphabetical':
        comparison = aVal.toString().localeCompare(bVal.toString());
        break;
      
      case 'numerical':
        const numA = typeof aVal === 'number' ? aVal : parseFloat(aVal) || 0;
        const numB = typeof bVal === 'number' ? bVal : parseFloat(bVal) || 0;
        comparison = numA - numB;
        break;
      
      case 'date':
        const dateA = new Date(aVal);
        const dateB = new Date(bVal);
        comparison = dateA.getTime() - dateB.getTime();
        break;
      
      default:
        comparison = aVal.toString().localeCompare(bVal.toString());
    }
    
    return sort.direction === 'desc' ? -comparison : comparison;
  });
};

// Filtering utilities
const filterData = (data: any[], filters: TableFilters): any[] => {
  return data.filter(row => {
    return Object.entries(filters).every(([columnKey, filterValues]) => {
      if (!filterValues || filterValues.length === 0) return true;
      const cellValue = row[columnKey];
      return filterValues.includes(cellValue);
    });
  });
};

/**
 * StandardTable Component
 * 
 * A comprehensive table component with automatic data type detection, filtering, and sorting.
 * 
 * Features:
 * - Automatic status field filtering: Status columns default to showing only 'active' items
 * - Auto-detection of data types (category, currency, date, percentage, etc.)
 * - Responsive design with font scaling
 * - Built-in filtering and sorting controls
 */
const StandardTable: React.FC<StandardTableProps> = ({
  data,
  columns,
  className = '',
  maxWidth = 1600, // Increased default for better column fitting
  minFontSize = 10,  // Reduced minimum for ultra-compression
  onRowClick
}) => {
  const [sort, setSort] = useState<TableSort | null>(null);
  
  // Initialize filters with default 'active' status for status columns
  const [filters, setFilters] = useState<TableFilters>(() => {
    const defaultFilters: TableFilters = {};
    
    // Look for status-related columns and set default to 'active'
    columns.forEach(column => {
      if (column.key.toLowerCase() === 'status' || 
          column.label.toLowerCase() === 'status' ||
          column.key.toLowerCase().includes('status')) {
        // Check if the data contains 'active' status values
        const hasActiveStatus = data.some(row => 
          row[column.key] && 
          row[column.key].toString().toLowerCase() === 'active'
        );
        
        if (hasActiveStatus) {
          defaultFilters[column.key] = ['active'];
        }
      }
    });
    
    return defaultFilters;
  });
  
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure container width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Process columns with auto-detection
  const processedColumns = useMemo(() => {
    return columns.map((column, index) => {
      let detection;
      
      if (column.control === 'auto' || !column.control) {
        // Use auto-detection for control type
        detection = detectDataType(data, column.key);
        // If dataType was explicitly set, override the detected dataType
        if (column.dataType) {
          detection.dataType = column.dataType;
          // Also update control type and sort types based on explicit dataType
          if (column.dataType === 'category') {
            detection.controlType = 'filter';
            detection.sortTypes = [];
          } else           if (column.dataType === 'text' || column.dataType === 'provider') {
            detection.controlType = 'sort';
            detection.sortTypes = ['alphabetical'];
          } else if (column.dataType === 'number' || column.dataType === 'currency' || column.dataType === 'percentage' || column.dataType === 'risk') {
            detection.controlType = 'sort';
            detection.sortTypes = ['numerical'];
          } else if (column.dataType === 'date') {
            detection.controlType = 'sort';
            detection.sortTypes = ['date'];
          }
        }
      } else {
        // Use explicit control setting
        detection = { 
          dataType: column.dataType || 'text', 
          controlType: column.control,
          sortTypes: column.dataType === 'text' || column.dataType === 'provider' ? ['alphabetical'] as SortType[] : 
                    column.dataType === 'number' || column.dataType === 'currency' || column.dataType === 'percentage' || column.dataType === 'risk' ? ['numerical'] as SortType[] :
                    column.dataType === 'date' ? ['date'] as SortType[] : [] as SortType[]
        };
      }

      return {
        ...column,
        dataType: detection.dataType,
        controlType: detection.controlType,
        sortTypes: detection.sortTypes as SortType[],
        alignment: column.alignment || (index === 0 ? 'left' : 'right')
      };
    });
  }, [columns, data]);

  // Auto-sort first column alphabetically if it contains text/letters
  useEffect(() => {
    // Only set default sort if no sort is currently applied and we have data and columns
    if (!sort && data.length > 0 && processedColumns.length > 0) {
      const firstColumn = processedColumns[0];
      
      // Check if first column contains text/letters by examining the data
      const firstColumnValues = data.map(row => row[firstColumn.key]).filter(v => v != null && v !== '');
      
      if (firstColumnValues.length > 0) {
        // Check if values contain letters (not just numbers or dates)
        const hasLetters = firstColumnValues.some(value => {
          const str = value.toString();
          return /[a-zA-Z]/.test(str);
        });
        
        // If the first column has letters and is sortable, set default alphabetical sort
        if (hasLetters && (firstColumn.dataType === 'text' || firstColumn.dataType === 'provider' || firstColumn.controlType === 'sort')) {
          setSort({
            columnKey: firstColumn.key,
            type: 'alphabetical',
            direction: 'asc'
          });
        }
      }
    }
  }, [data, processedColumns, sort]);

  // Calculate responsive styling based on column count and available space
  const responsiveStyle = useMemo(() => {
    const columnCount = processedColumns.length;
    
    // Calculate minimum width needed per column (with controls)
    const minColumnWidth = 120; // Minimum reasonable width per column
    const ideaColumnWidth = 160; // Ideal width per column
    const targetTableWidth = columnCount * ideaColumnWidth;
    const minTableWidth = columnCount * minColumnWidth;
    
    // If no container width measured yet, use defaults
    if (containerWidth === 0) {
      return {
        fontSize: '14px',
        padding: '12px',
        needsScroll: false,
        paddingClass: 'px-3 py-2'
      };
    }
    
    // Ultra-aggressive compression for many columns
    if (columnCount >= 8) {
      // Many columns - be very aggressive
      if (containerWidth >= targetTableWidth) {
        return {
          fontSize: '13px',
          padding: '6px',
          needsScroll: false,
          paddingClass: 'px-2 py-1'
        };
      } else if (containerWidth >= minTableWidth) {
        return {
          fontSize: '12px',
          padding: '4px',
          needsScroll: false,
          paddingClass: 'px-2 py-1'
        };
      } else if (containerWidth >= minTableWidth * 0.8) {
        return {
          fontSize: '11px',
          padding: '3px',
          needsScroll: false,
          paddingClass: 'px-1.5 py-0.5'
        };
      } else {
        return {
          fontSize: '10px',
          padding: '3px',
          needsScroll: true,
          paddingClass: 'px-1.5 py-0.5'
        };
      }
    } else if (columnCount >= 6) {
      // Medium number of columns
      if (containerWidth >= targetTableWidth) {
        return {
          fontSize: '14px',
          padding: '8px',
          needsScroll: false,
          paddingClass: 'px-3 py-1.5'
        };
      } else if (containerWidth >= minTableWidth) {
        return {
          fontSize: '13px',
          padding: '6px',
          needsScroll: false,
          paddingClass: 'px-2 py-1'
        };
      } else if (containerWidth >= minTableWidth * 0.8) {
        return {
          fontSize: '12px',
          padding: '4px',
          needsScroll: false,
          paddingClass: 'px-2 py-1'
        };
      } else {
        return {
          fontSize: '11px',
          padding: '3px',
          needsScroll: true,
          paddingClass: 'px-2 py-0.5'
        };
      }
    } else {
      // Few columns - normal behavior
      if (containerWidth >= targetTableWidth) {
        return {
          fontSize: '14px',
          padding: '12px',
          needsScroll: false,
          paddingClass: 'px-4 py-2'
        };
      } else if (containerWidth >= minTableWidth) {
        return {
          fontSize: '13px',
          padding: '8px',
          needsScroll: false,
          paddingClass: 'px-3 py-1.5'
        };
      } else {
        return {
          fontSize: '12px',
          padding: '6px',
          needsScroll: true,
          paddingClass: 'px-2 py-1'
        };
      }
    }
  }, [containerWidth, processedColumns.length]);

  // Generate filter options for categorical columns
  const getFilterOptions = (columnKey: string): FilterOption[] => {
    const uniqueValues = [...new Set(data.map(row => row[columnKey]))]
      .filter(v => v != null)
      .sort();
    
    return uniqueValues.map(value => ({
      value,
      label: value.toString()
    }));
  };

  // Process data with filters and sorting
  const processedData = useMemo(() => {
    let result = filterData(data, filters);
    result = sortData(result, sort);
    return result;
  }, [data, filters, sort]);

  // Handle sort changes
  const handleSortChange = (columnKey: string) => (type: SortType, direction: SortDirection) => {
    if (direction === null) {
      setSort(null);
    } else {
      setSort({ columnKey, type, direction });
    }
  };

  // Handle filter changes
  const handleFilterChange = (columnKey: string) => (values: (string | number)[]) => {
    setFilters(prev => ({
      ...prev,
      [columnKey]: values
    }));
  };

  // Calculate adaptive row height based on content
  const getRowHeight = (rowData: any): string => {
    const hasLongContent = processedColumns.some(col => {
      const value = rowData[col.key];
      return value && value.toString().length > 50;
    });
    
    if (hasLongContent) return '40px'; // reduced from 56px
    
    const hasModerateContent = processedColumns.some(col => {
      const value = rowData[col.key];
      return value && value.toString().length > 25;
    });
    
    return hasModerateContent ? '32px' : '28px'; // reduced from 48px and 40px
  };

  // Get column text styling to match client groups table with responsive sizing
  const getColumnTextStyle = (dataType: ColumnConfig['dataType'], isFirstColumn: boolean): string => {
    const baseTextSize = processedColumns.length >= 8 ? 'text-xs' : 
                        processedColumns.length >= 6 ? 'text-sm' : 'text-sm';
    
    if (isFirstColumn) {
      return `${baseTextSize} font-medium text-gray-800 font-sans tracking-tight text-left`;
    }
    
    // All other columns align left to match the header label position
    switch (dataType) {
      case 'currency':
        return `${baseTextSize} font-medium text-indigo-600 text-left`;
      case 'percentage':
        return `${baseTextSize} font-medium text-indigo-600 text-left`;
      case 'number':
        return `${baseTextSize} text-gray-600 text-left`;
      case 'date':
        return `${baseTextSize} text-gray-600 text-left`;
      case 'category':
        return `${baseTextSize} text-gray-600 text-left`;
      default:
        return `${baseTextSize} text-gray-600 text-left`;
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`w-full ${responsiveStyle.needsScroll ? 'overflow-x-auto overflow-visible' : ''} ${className}`}
    >
      <table 
        className="min-w-full table-fixed divide-y divide-gray-200"
        style={{ 
          fontSize: responsiveStyle.fontSize,
        }}
      >
        <thead className="bg-gray-100">
          <tr>
            {processedColumns.map((column, index) => (
              <th
                key={column.key}
                className={`px-2 py-1 text-left ${processedColumns.length >= 8 ? 'text-xs' : 'text-sm'} font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300`}
                style={{ 
                  width: `${100 / processedColumns.length}%`,
                  fontSize: responsiveStyle.fontSize
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="truncate">
                    {column.label}
                  </span>
                  
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {column.controlType === 'filter' && (
                      <TableFilter
                        options={getFilterOptions(column.key)}
                        values={filters[column.key] || []}
                        onChange={handleFilterChange(column.key)}
                        title={`Filter ${column.label}`}
                      />
                    )}
                    
                    {column.controlType === 'sort' && (
                      <TableSort
                        currentSort={sort?.columnKey === column.key ? sort : undefined}
                        onSortChange={handleSortChange(column.key)}
                        sortTypes={column.sortTypes}
                        title={`Sort ${column.label}`}
                      />
                    )}
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        
        <tbody className="bg-white divide-y divide-gray-200">
          {processedData.map((row, index) => (
            <tr
              key={index}
              className="hover:bg-indigo-50 transition-colors duration-150 cursor-pointer border-b border-gray-100"
              onClick={() => onRowClick?.(row, index)}
            >
              {processedColumns.map((column, colIndex) => (
                <td
                  key={column.key}
                  className={`${responsiveStyle.paddingClass} whitespace-nowrap align-top`}
                >
                  {colIndex === 0 ? (
                    // First column: align left to match header label position
                    column.format ? (
                      formatValue(row[column.key], column.dataType, column.format, row)
                    ) : (
                      <div className={`truncate ${getColumnTextStyle(column.dataType, true)}`}>
                        {formatValue(row[column.key], column.dataType, column.format, row)}
                      </div>
                    )
                  ) : (
                    // Other columns: use flex layout to align with header structure
                    <div className="flex items-center gap-2">
                      {column.format ? (
                        formatValue(row[column.key], column.dataType, column.format, row)
                      ) : (
                        <div className={`truncate ${getColumnTextStyle(column.dataType, false)}`}>
                          {formatValue(row[column.key], column.dataType, column.format, row)}
                        </div>
                      )}
                      {/* Spacer to align with control area in header */}
                      <div className="flex items-center gap-1 flex-shrink-0" style={{ 
                        width: processedColumns.length >= 8 ? '28px' : processedColumns.length >= 6 ? '36px' : '44px' 
                      }}>
                        {/* Empty space matching the control area width */}
                      </div>
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {processedData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No data matches the current filters</p>
        </div>
      )}
    </div>
  );
};

export default StandardTable; 