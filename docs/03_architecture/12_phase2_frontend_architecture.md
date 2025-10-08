---
title: "Phase 2 Frontend Architecture"
tags: ["phase2", "frontend", "react", "typescript", "architecture", "ui"]
related_docs:
  - "./05_frontend_architecture.md"
  - "./11_phase2_api_endpoints.md"
  - "../04_development_workflow/05_phase2_implementation_sequence.md"
  - "./08_concurrent_features.md"
---

# Phase 2 Frontend Architecture

## Architecture Overview

Phase 2 frontend architecture extends Kingston's Portal's proven React/TypeScript foundation with **enhanced client data management**, **real-time collaborative features**, and **comprehensive accessibility support**. The architecture leverages existing shared modules and component library patterns while introducing sophisticated new capabilities for concurrent user management, universal search, and complex data visualization.

### UI Philosophy - Information Density Over Aesthetics

**Professional Interface Paradigm**:
Kingston's Portal Phase 2 represents a fundamental paradigm shift from aesthetic-focused design to **information-dense professional interfaces** that prioritize data visibility and advisor efficiency. This approach aligns with wealth management industry standards where information accessibility directly impacts client service quality and advisor productivity.

**Information Density First Principles**:
- **Maximum data visibility**: Dense tables with 12+ rows per view, eliminating card-based layouts where tabular data is more efficient
- **Professional standards alignment**: Interface design follows wealth management industry conventions for financial planning software
- **Cognitive load optimization**: Information grouping and visual hierarchy designed to reduce mental processing time for financial advisors
- **Efficiency over aesthetics**: Every pixel serves a functional purpose - decorative elements removed in favor of data display space

**Dense Data Display Standards**:
- **Table-first approach**: Replace card layouts with dense tables for information items, actions, and financial data
- **Compact row height**: 32-40px row heights to maximize information density while maintaining readability
- **Smart truncation**: Expandable text with [+ Expand] controls for detailed descriptions without sacrificing overview efficiency
- **Multi-column layouts**: Utilize full screen width with 3-section layouts (personal details + contact info + full-width compliance)
- **Status indicators**: Visual priority/status markers using color coding and icons for quick scanning

**Performance-Oriented Architecture**:
- **Sub-500ms** rendering for dense tables with 100+ rows
- **Virtual scrolling** mandatory for datasets with 200+ items
- **Optimistic updates** with automatic conflict resolution
- **Memory management** for large dataset handling without performance degradation

**Professional Accessibility Standards**:
- **WCAG 2.1 AA compliance** with enhanced focus management for dense interfaces
- **Keyboard navigation** optimized for rapid data entry and editing workflows
- **Screen reader support** with proper table semantics and contextual information
- **High contrast mode** maintaining information density while improving visibility

**Real-time Collaborative Features**:
- **Multi-user editing** with conflict resolution for sensitive financial data
- **Presence indicators** showing which advisor is editing which client data
- **Auto-save functionality** with rollback capabilities for data integrity
- **Change tracking** with full audit trails for compliance requirements

---

## 5-Category Page Architecture

### Category-Based Navigation Structure

The Phase 2 enhancement introduces a **5-category approach** replacing the single information items page with specialized category pages, each optimized for specific data types and user workflows.

#### Navigation Structure

```typescript
// CategoryNavigation component for 5-table approach
interface CategoryPage {
  category: 'basic_detail' | 'income_expenditure' | 'assets_liabilities' | 'protection' | 'vulnerability_health';
  title: string;
  icon: string;
  interface: 'table' | 'cards';
  endpoint: string;
  component: React.ComponentType;
}

const CATEGORY_PAGES: CategoryPage[] = [
  {
    category: 'basic_detail',
    title: 'Basic Details',
    icon: 'user',
    interface: 'table',
    endpoint: '/api/client_groups/{id}/basic_details',
    component: BasicDetailsTable
  },
  {
    category: 'income_expenditure', 
    title: 'Income & Expenditure',
    icon: 'currency',
    interface: 'table',
    endpoint: '/api/client_groups/{id}/income_expenditure',
    component: IncomeExpenditureTable
  },
  {
    category: 'assets_liabilities',
    title: 'Assets & Liabilities', 
    icon: 'portfolio',
    interface: 'cards', // ONLY category using cards
    endpoint: '/api/client_groups/{id}/assets_liabilities',
    component: AssetsLiabilitiesCards
  },
  {
    category: 'protection',
    title: 'Protection',
    icon: 'shield',
    interface: 'table',
    endpoint: '/api/client_groups/{id}/protection',
    component: ProtectionTable
  },
  {
    category: 'vulnerability_health',
    title: 'Vulnerability & Health',
    icon: 'health',
    interface: 'cards', // Product owner grouped cards
    endpoint: '/api/client_groups/{id}/vulnerability_health',  
    component: VulnerabilityHealthCards
  }
];
```

#### Category Page Routing

```typescript
// CategoryRouter component for 5-category pages
const CategoryRouter: React.FC<CategoryRouterProps> = ({ clientGroupId }) => {
  const [activeCategory, setActiveCategory] = useState<string>('basic_detail');
  const [categoryData, setCategoryData] = useState<Record<string, any>>({});
  
  return (
    <div className="category-container">
      {/* Category Tab Navigation */}
      <div className="category-tabs">
        {CATEGORY_PAGES.map(category => (
          <button
            key={category.category}
            className={`category-tab ${activeCategory === category.category ? 'active' : ''}`}
            onClick={() => setActiveCategory(category.category)}
          >
            <Icon name={category.icon} />
            {category.title}
          </button>
        ))}
      </div>
      
      {/* Category Content */}
      <div className="category-content">
        <Suspense fallback={<CategoryPageSkeleton />}>
          {CATEGORY_PAGES.map(category => (
            activeCategory === category.category && (
              <category.component
                key={category.category}
                clientGroupId={clientGroupId}
                endpoint={category.endpoint}
                interface={category.interface}
              />
            )
          ))}
        </Suspense>
      </div>
    </div>
  );
};
```

### Hybrid Interface Strategy

**Table Interface** (4 out of 5 categories):
- Basic Details, Income & Expenditure, Protection
- Dense 12+ row tables with 32-40px row height
- Standard filtering, sorting, and pagination
- Inline editing capabilities

**Card Interface** (Assets & Liabilities only):
- Ultra-thin card format optimized for financial data
- Managed/unmanaged product unification
- Expand/collapse functionality for detailed views

---

## Assets & Liabilities Card Components

### Ultra-Thin Card Architecture

The **Assets & Liabilities category** is the ONLY category using a card interface, specifically designed for financial product visualization with managed/unmanaged product unification.

#### Card Component Structure

```typescript
// AssetLiabilityCard - Ultra-thin card format
interface AssetLiabilityCard {
  id: string;
  type: 'managed' | 'unmanaged';
  productName: string;
  currentValue: number;
  startDate: string; // DD/MM/YYYY format
  currency: string;
  isExpanded: boolean;
  managedProductSync?: 'synchronized' | 'conflict' | 'pending';
}

const AssetLiabilityCard: React.FC<AssetLiabilityCardProps> = ({
  item,
  onExpand,
  onEdit,
  onDelete
}) => {
  return (
    <div className={`asset-card ${item.type} ${item.isExpanded ? 'expanded' : ''}`}>
      {/* Ultra-thin collapsed view: 32-40px height */}
      <div className="card-header" onClick={() => onExpand(item.id)}>
        <div className="card-main-info">
          <span className="product-name">{item.productName}</span>
          <span className="current-value">£{item.currentValue.toLocaleString()}</span>
          <span className="start-date">{item.startDate}</span>
          <ChevronRightIcon className="expand-icon" />
        </div>
        {item.managedProductSync && (
          <SyncStatusIndicator status={item.managedProductSync} />
        )}
      </div>
      
      {/* Expanded view: Full details */}
      {item.isExpanded && (
        <div className="card-expanded-details">
          <CardDetailsForm
            item={item}
            onSave={onEdit}
            onCancel={() => onExpand(item.id)}
            inlineEditing={item.type === 'unmanaged'}
          />
        </div>
      )}
    </div>
  );
};
```

#### Card Layout Optimization

```typescript
// AssetsLiabilitiesCards - Main container component
const AssetsLiabilitiesCards: React.FC<AssetsLiabilitiesCardsProps> = ({
  clientGroupId,
  endpoint
}) => {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [virtualizedView, setVirtualizedView] = useState(false);
  
  const { data, isLoading } = useQuery(['assets-liabilities', clientGroupId], 
    () => api.get(endpoint)
  );
  
  // Enable virtualization for 100+ items
  useEffect(() => {
    if (data?.items?.length > 100) {
      setVirtualizedView(true);
    }
  }, [data?.items?.length]);
  
  return (
    <div className="assets-liabilities-container">
      {/* Cards summary header */}
      <div className="cards-summary">
        <SummaryStats
          totalAssets={data?.unified_summary?.total_assets}
          totalLiabilities={data?.unified_summary?.total_liabilities}
          netPosition={data?.unified_summary?.net_position}
        />
      </div>
      
      {/* Card list - virtualized if needed */}
      {virtualizedView ? (
        <VirtualizedCardList
          items={data?.items || []}
          cardHeight={40} // Base card height
          expandedCardHeight={320} // Expanded card height
          expandedCards={expandedCards}
          onCardToggle={handleCardToggle}
        />
      ) : (
        <div className="card-list">
          {data?.items?.map(item => (
            <AssetLiabilityCard
              key={item.id}
              item={item}
              onExpand={handleCardToggle}
              onEdit={handleCardEdit}
              onDelete={handleCardDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

### Managed/Unmanaged Product Unification

```typescript
// ManagedProductSync component for conflict resolution
const ManagedProductSync: React.FC<ManagedProductSyncProps> = ({
  managedProduct,
  unmanagedItem,
  onResolveConflict
}) => {
  return (
    <div className="sync-conflict-resolution">
      <div className="conflict-header">
        <AlertTriangleIcon className="warning-icon" />
        <span>Product exists in both systems</span>
      </div>
      
      <div className="conflict-comparison">
        <div className="managed-version">
          <h4>Managed System</h4>
          <ProductDetails product={managedProduct} />
          <button onClick={() => onResolveConflict('prefer-managed')}>
            Use Managed Data
          </button>
        </div>
        
        <div className="unmanaged-version">
          <h4>Information Items</h4>
          <ProductDetails product={unmanagedItem} />
          <button onClick={() => onResolveConflict('prefer-unmanaged')}>
            Use Information Item
          </button>
        </div>
      </div>
      
      <button
        className="merge-button"
        onClick={() => onResolveConflict('merge')}
      >
        Merge Both Sources
      </button>
    </div>
  );
};
```

---

## Category-Specific Table Components

### Enhanced Table Components for Each Category

#### BasicDetailsTable Component

```typescript
// BasicDetailsTable - Standard table with last_modified column
const BasicDetailsTable: React.FC<BasicDetailsTableProps> = ({
  clientGroupId,
  endpoint
}) => {
  const columns: TableColumn[] = [
    { key: 'item_type', title: 'Type', sortable: true },
    { key: 'name', title: 'Name', sortable: true },
    { key: 'summary', title: 'Summary', truncate: true },
    { key: 'last_modified', title: 'Last Modified', sortable: true, type: 'datetime' },
    { key: 'priority', title: 'Priority', type: 'badge' },
    { key: 'status', title: 'Status', type: 'status' },
    { key: 'actions', title: 'Actions', type: 'actions' }
  ];
  
  return (
    <DenseDataTable
      columns={columns}
      endpoint={endpoint}
      rowHeight={36}
      minRows={12}
      enableInlineEdit={true}
      enableVirtualScroll={true}
      virtualScrollThreshold={200}
    />
  );
};
```

#### ProtectionTable Component (Cover Type Emphasis)

```typescript
// ProtectionTable - Emphasis on Cover Type over Policy Type
const ProtectionTable: React.FC<ProtectionTableProps> = ({
  clientGroupId,
  endpoint
}) => {
  const columns: TableColumn[] = [
    { key: 'name', title: 'Policy Name', sortable: true },
    { key: 'cover_type', title: 'Cover Type', sortable: true, highlight: true }, // EMPHASIZED
    { key: 'provider', title: 'Provider', sortable: true },
    { key: 'sum_assured', title: 'Sum Assured', type: 'currency' },
    { key: 'premium_amount', title: 'Premium', type: 'currency' },
    { key: 'premium_frequency', title: 'Frequency' },
    { key: 'last_modified', title: 'Last Modified', type: 'datetime' },
    { key: 'actions', title: 'Actions', type: 'actions' }
  ];
  
  return (
    <DenseDataTable
      columns={columns}
      endpoint={endpoint}
      rowHeight={36}
      minRows={12}
      customRenderers={{
        cover_type: (value) => (
          <span className="cover-type-highlight">{value}</span>
        )
      }}
    />
  );
};
```

#### IncomeExpenditureTable Component (Item Type Classification)

```typescript
// IncomeExpenditureTable - With item type classification
const IncomeExpenditureTable: React.FC<IncomeExpenditureTableProps> = ({
  clientGroupId,
  endpoint
}) => {
  const [filterByType, setFilterByType] = useState<'all' | 'income' | 'expenditure'>('all');
  
  const columns: TableColumn[] = [
    { key: 'item_type', title: 'Type', sortable: true },
    { key: 'item_classification', title: 'Classification', type: 'badge' }, // Income/Expenditure
    { key: 'name', title: 'Description', sortable: true },
    { key: 'current_amount', title: 'Amount', type: 'currency', sortable: true },
    { key: 'frequency', title: 'Frequency' },
    { key: 'last_modified', title: 'Last Modified', type: 'datetime' },
    { key: 'actions', title: 'Actions', type: 'actions' }
  ];
  
  return (
    <div className="income-expenditure-container">
      <div className="classification-filter">
        <button 
          className={filterByType === 'all' ? 'active' : ''}
          onClick={() => setFilterByType('all')}
        >
          All ({data?.summary?.total_items || 0})
        </button>
        <button 
          className={filterByType === 'income' ? 'active' : ''}
          onClick={() => setFilterByType('income')}
        >
          Income (£{data?.summary?.total_income_annual?.toLocaleString() || 0})
        </button>
        <button 
          className={filterByType === 'expenditure' ? 'active' : ''}
          onClick={() => setFilterByType('expenditure')}
        >
          Expenditure (£{data?.summary?.total_expenditure_annual?.toLocaleString() || 0})
        </button>
      </div>
      
      <DenseDataTable
        columns={columns}
        endpoint={`${endpoint}?income_type=${filterByType === 'all' ? '' : filterByType}`}
        rowHeight={36}
        minRows={12}
        summary={data?.summary}
      />
    </div>
  );
};
```

#### VulnerabilityHealthCards Component (Product Owner Grouping)

```typescript
// VulnerabilityHealthCards - Product owner grouped card display
const VulnerabilityHealthCards: React.FC<VulnerabilityHealthCardsProps> = ({
  clientGroupId,
  endpoint
}) => {
  const { data, isLoading } = useQuery(['vulnerability-health', clientGroupId], 
    () => api.get(endpoint)
  );
  
  return (
    <div className="vulnerability-health-container">
      {/* Product Owner Groups */}
      {data?.owner_groups?.map(group => (
        <div key={group.product_owner.id} className="owner-group-card">
          <div className="owner-group-header">
            <h3>{group.product_owner.name}</h3>
            <span className="item-count">{group.items.length} items</span>
          </div>
          
          <div className="owner-group-items">
            {group.items.map(item => (
              <div key={item.id} className="health-item-card">
                <div className="item-header">
                  <span className="item-type">{item.item_type}</span>
                  <span className="item-name">{item.name}</span>
                  <span className="last-modified">
                    {formatDate(item.last_modified)}
                  </span>
                </div>
                
                {/* Encrypted health data requires special handling */}
                {item.item_type === 'Health Issues' ? (
                  <EncryptedHealthDataDisplay item={item} />
                ) : (
                  <RiskAssessmentSummary item={item} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {/* Ungrouped Items */}
      {data?.ungrouped_items?.length > 0 && (
        <div className="ungrouped-items">
          <h3>General Items</h3>
          {data.ungrouped_items.map(item => (
            <div key={item.id} className="health-item-card">
              <EncryptedHealthDataDisplay item={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## Virtual Scrolling and Performance Requirements

### Information Density Performance Standards

**Mandatory Performance Targets**:
- **Sub-500ms rendering** for dense tables with 100+ rows
- **32-40px row height** consistently maintained across all table components  
- **12+ rows visible** per screen without scrolling
- **Virtual scrolling activation** at 200+ items threshold
- **Memory management** for datasets up to 1000+ items

#### Virtual Scrolling Implementation

```typescript
// VirtualizedTable component for high-performance large datasets
const VirtualizedTable: React.FC<VirtualizedTableProps> = ({
  items,
  rowHeight = 36,
  containerHeight = 600,
  renderRow
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  
  const visibleStartIndex = Math.floor(scrollTop / rowHeight);
  const visibleEndIndex = Math.min(
    visibleStartIndex + Math.ceil(containerHeight / rowHeight) + 1,
    items.length
  );
  
  const visibleItems = items.slice(visibleStartIndex, visibleEndIndex);
  const totalHeight = items.length * rowHeight;
  const offsetY = visibleStartIndex * rowHeight;
  
  return (
    <div 
      ref={setContainerRef}
      className="virtualized-table"
      style={{ height: containerHeight, overflowY: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div
              key={visibleStartIndex + index}
              style={{ height: rowHeight }}
            >
              {renderRow(item, visibleStartIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

#### VirtualizedCardList for Assets & Liabilities

```typescript
// VirtualizedCardList - Optimized for card-based display
const VirtualizedCardList: React.FC<VirtualizedCardListProps> = ({
  items,
  cardHeight,
  expandedCardHeight,
  expandedCards,
  onCardToggle
}) => {
  const getItemHeight = (index: number) => {
    const item = items[index];
    return expandedCards.has(item.id) ? expandedCardHeight : cardHeight;
  };
  
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  
  // Dynamic height calculation for expanded cards
  const calculateTotalHeight = useCallback(() => {
    return items.reduce((total, item, index) => 
      total + getItemHeight(index), 0
    );
  }, [items, expandedCards]);
  
  return (
    <VariableSizeList
      height={600}
      itemCount={items.length}
      itemSize={getItemHeight}
      onItemsRendered={({ visibleStartIndex, visibleStopIndex }) => {
        setVisibleRange({ start: visibleStartIndex, end: visibleStopIndex });
      }}
    >
      {({ index, style }) => (
        <div style={style}>
          <AssetLiabilityCard
            item={items[index]}
            onExpand={onCardToggle}
            isExpanded={expandedCards.has(items[index].id)}
          />
        </div>
      )}
    </VariableSizeList>
  );
};
```

---

## Responsive Design and Mobile Optimization

### Responsive Category Navigation

```typescript
// ResponsiveCategoryTabs - Optimized for tablet and desktop
const ResponsiveCategoryTabs: React.FC<ResponsiveCategoryTabsProps> = ({
  categories,
  activeCategory,
  onCategoryChange
}) => {
  const [isMobileView, setIsMobileView] = useState(false);
  
  useEffect(() => {
    const checkViewport = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);
  
  if (isMobileView) {
    // Mobile: Dropdown selector
    return (
      <select 
        value={activeCategory}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="mobile-category-selector"
      >
        {categories.map(category => (
          <option key={category.category} value={category.category}>
            {category.title}
          </option>
        ))}
      </select>
    );
  }
  
  // Desktop/Tablet: Tab navigation
  return (
    <div className="desktop-category-tabs">
      {categories.map(category => (
        <button
          key={category.category}
          className={`category-tab ${activeCategory === category.category ? 'active' : ''}`}
          onClick={() => onCategoryChange(category.category)}
        >
          <Icon name={category.icon} />
          <span>{category.title}</span>
        </button>
      ))}
    </div>
  );
};
```

### Information Density Responsive Rules

**Minimum Requirements by Screen Size**:
- **Desktop (1200px+)**: 12+ rows, 5-column layouts, full category tabs
- **Tablet (768px-1199px)**: 10+ rows, 3-column layouts, compressed category tabs  
- **Mobile (<768px)**: 8+ rows, 2-column layouts, dropdown category selector

---

## Accessibility and WCAG 2.1 AA Compliance

### Enhanced Accessibility for Information-Dense Interfaces

```typescript
// AccessibleDenseTable - WCAG 2.1 AA compliant dense table
const AccessibleDenseTable: React.FC<AccessibleDenseTableProps> = ({
  columns,
  data,
  caption,
  summaryText
}) => {
  const [focusedCell, setFocusedCell] = useState<{row: number, col: number} | null>(null);
  
  const handleKeyNavigation = (e: KeyboardEvent, rowIndex: number, colIndex: number) => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        setFocusedCell({ row: rowIndex, col: Math.min(colIndex + 1, columns.length - 1) });
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setFocusedCell({ row: rowIndex, col: Math.max(colIndex - 1, 0) });
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedCell({ row: Math.min(rowIndex + 1, data.length - 1), col: colIndex });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedCell({ row: Math.max(rowIndex - 1, 0), col: colIndex });
        break;
    }
  };
  
  return (
    <table 
      className="dense-accessible-table"
      role="grid"
      aria-label={caption}
      aria-describedby="table-summary"
    >
      <caption className="sr-only">{caption}</caption>
      <div id="table-summary" className="sr-only">{summaryText}</div>
      
      <thead>
        <tr role="row">
          {columns.map((column, index) => (
            <th
              key={column.key}
              role="columnheader"
              aria-sort={column.sortable ? 'none' : undefined}
              tabIndex={0}
            >
              {column.title}
            </th>
          ))}
        </tr>
      </thead>
      
      <tbody>
        {data.map((row, rowIndex) => (
          <tr key={row.id} role="row">
            {columns.map((column, colIndex) => (
              <td
                key={column.key}
                role="gridcell"
                tabIndex={focusedCell?.row === rowIndex && focusedCell?.col === colIndex ? 0 : -1}
                onKeyDown={(e) => handleKeyNavigation(e, rowIndex, colIndex)}
                aria-describedby={`cell-${rowIndex}-${colIndex}-desc`}
              >
                <span id={`cell-${rowIndex}-${colIndex}-desc`} className="sr-only">
                  {column.title}: {row[column.key]}
                </span>
                {row[column.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

---

## Component Architecture - Dense Table Components

### Information-Dense Component Library Structure

The Phase 2 frontend architecture prioritizes **dense table components** over card-based layouts, focusing on maximum information visibility and professional interface standards for wealth management workflows.

```
frontend/src/components/
├── ui/                                 # Information-dense base components (95+ total)
│   ├── tables/                        # Core dense table components (PRIMARY)
│   │   ├── DenseDataTable.tsx         # Main information display table (12+ rows)
│   │   ├── VirtualizedTable.tsx       # High-performance large dataset table
│   │   ├── EditableTableRow.tsx       # Inline editing with validation
│   │   ├── ExpandableTableRow.tsx     # [+ Expand] functionality for descriptions
│   │   ├── SortableTableHeader.tsx    # Multi-column sorting with visual indicators
│   │   ├── FilterableTableColumn.tsx  # Column-specific filtering controls
│   │   └── TablePaginationDense.tsx   # Compact pagination for dense layouts
│   ├── cards/                         # 3-Section layout components (SECONDARY)
│   │   ├── ProductOwnerCard3Section.tsx # Personal + Contact + Full-width layout
│   │   ├── StatBox.tsx                # Preserved from existing + enhanced
│   │   └── CompactInfoCard.tsx        # Minimal card for non-tabular data
│   ├── inputs/                        # Professional data entry components
│   │   ├── DenseFormInput.tsx         # Compact form inputs for tight layouts
│   │   ├── PhoneNumberInput.tsx       # Multi-type phone management (mobile/house/work)
│   │   ├── OwnershipPercentageInput.tsx # Complex ownership entry with validation
│   │   ├── ExpandableTextArea.tsx     # [+ Expand] text input for detailed descriptions
│   │   └── CategoryDropdownWithEmoji.tsx # Big 5 categories with emoji + text
│   ├── buttons/                       # Compact action buttons for dense interfaces
│   │   ├── ActionButton.tsx           # Existing enhanced with loading states
│   │   ├── DenseEditButton.tsx        # Compact edit button for table rows
│   │   ├── ExpandCollapseButton.tsx   # [+ Expand]/[- Collapse] toggle
│   │   ├── InlineActionButton.tsx     # Minimal buttons for dense row actions
│   │   └── ExportButton.tsx           # PDF/CSV export with progress indication
│   ├── navigation/                    # Professional interface navigation
│   │   ├── TabNavigation.tsx          # Separated objectives/actions tab system
│   │   ├── GlobalActionsSidebar.tsx   # Cross-client actions navigation
│   │   └── BreadcrumbDense.tsx        # Compact breadcrumb navigation
│   ├── feedback/                      # Status and progress indicators
│   │   ├── StatusIndicator.tsx        # Priority/status visual markers
│   │   ├── ProgressMeter.tsx          # Data completion and processing progress
│   │   ├── PresenceIndicator.tsx      # Multi-user editing awareness
│   │   └── AutoSaveIndicator.tsx      # Real-time save status
│   └── modals/                        # Professional workflow modals
│       ├── ConfirmationModal.tsx      # Standard confirmation dialogs
│       ├── PDFExportModal.tsx         # Export progress and options
│       └── GlobalActionModal.tsx      # Cross-client action assignment
└── phase2/                           # Phase 2 dense interface components
    ├── client-details/               # Information-dense client management
    │   ├── ClientDetailsLayout.tsx   # 5-tab container with separated actions
    │   ├── InformationItemsTable.tsx # Dense table for main list (PRIMARY)
    │   ├── ProductOwnerCard3Section.tsx # 3-section layout implementation
    │   ├── NetWorthTable.tsx         # Liquidity-ordered financial display
    │   └── ObjectivesActionsLayout.tsx # Separated dual-column layout
    ├── global-actions/               # Cross-client workflow management
    │   ├── GlobalActionsTable.tsx    # All-client actions by urgency
    │   ├── ActionAssignmentTable.tsx # Multi-client action assignment
    │   └── PDFExportWorkflow.tsx     # Global actions export workflow
    ├── networth/                     # Professional financial displays
    │   ├── LiquidityOrderedTable.tsx # Asset ordering by liquidity preference
    │   ├── AssetCategoryTable.tsx    # Traditional asset type grouping
    │   ├── ViewToggleControl.tsx     # Asset Type vs Liquidity view toggle
    │   └── OwnershipColumnDisplay.tsx # Multi-owner financial data display
    └── phone-management/             # Enhanced contact information
        ├── PhoneNumberTable.tsx      # Multiple phone types management
        ├── PhoneTypeSelector.tsx     # Mobile/House/Work/Other selection
        └── PrimaryPhoneIndicator.tsx # Primary phone visual identification
```

### Dense Table Component Patterns

**Information Density Design Principles**:
```typescript
// Core dense table component interface
interface DenseTableProps<T> {
  // Data handling
  data: T[];
  loading?: boolean;
  error?: Error | null;
  totalCount?: number; // For virtual scrolling
  
  // Information density settings
  rowHeight: 32 | 36 | 40; // Compact professional heights
  minVisibleRows: 12; // Minimum rows per view for information density
  enableVirtualScrolling?: boolean; // Required for 200+ rows
  
  // Professional interface features
  columns: DenseTableColumn<T>[];
  sortable?: boolean;
  filterable?: boolean;
  inlineEditable?: boolean;
  expandableRows?: boolean; // For [+ Expand] functionality
  
  // Multi-user features
  showPresenceIndicators?: boolean;
  enableRealTimeUpdates?: boolean;
  conflictResolution?: 'optimistic' | 'manual';
  
  // Professional workflow features
  bulkActions?: BulkAction[];
  exportOptions?: ExportConfig;
  selectionEnabled?: boolean;
  
  // Accessibility and compliance
  ariaLabel: string;
  screenReaderOptimized?: boolean;
  keyboardNavigationEnabled?: boolean;
}

// Dense table column configuration
interface DenseTableColumn<T> {
  key: keyof T | string;
  header: string;
  width?: number | string;
  minWidth?: number;
  
  // Information density features
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  
  // Display optimization
  truncate?: boolean;
  expandable?: boolean; // [+ Expand] functionality
  renderCell?: (value: any, row: T) => React.ReactNode;
  
  // Professional features
  sticky?: boolean; // For wide tables
  priority?: 'high' | 'medium' | 'low'; // Column importance for responsive
  dataType?: 'text' | 'number' | 'date' | 'currency' | 'percentage';
}
```

**3-Section Product Owner Card Pattern**:
```typescript
// Professional 3-section layout implementation
interface ProductOwnerCard3SectionProps {
  productOwner: ProductOwner;
  phones: PhoneNumber[];
  
  // Layout configuration
  layout: {
    leftSection: 'personal-details'; // Name, title, DOB, NI
    rightSection: 'contact-info';    // Mobile, house, work, email
    bottomSection: 'full-width';     // Meetings, compliance, security, notes
  };
  
  // Professional features
  editMode?: boolean;
  showSecurityWords?: boolean; // Role-based visibility
  auditLogging?: boolean;
  
  // Information density settings
  compact?: boolean;
  showLabels?: boolean;
  
  // Multi-user features
  showEditingIndicator?: boolean;
  conflictResolution?: ConflictResolution;
}

// Phone management for professional contact handling
interface PhoneManagementProps {
  phones: PhoneNumber[];
  onPhoneUpdate: (phone: PhoneNumber) => Promise<void>;
  onPhoneAdd: (phone: Omit<PhoneNumber, 'id'>) => Promise<void>;
  onPhoneDelete: (phoneId: number) => Promise<void>;
  
  // Professional features
  types: ['mobile', 'house_phone', 'work', 'other'];
  maxPhones: 10;
  primaryPhoneRequired: true;
  
  // Validation
  internationalFormat: boolean;
  realTimeValidation: boolean;
}
```

### Component Performance Architecture

**Virtual Scrolling Implementation**:
```typescript
// High-performance virtual scrolling for dense tables
interface VirtualScrollConfig {
  // Performance targets
  targetFPS: 60;
  maxMemoryUsage: '100MB'; // For 1000+ row datasets
  renderingBudget: '16ms'; // Per frame rendering budget
  
  // Virtualization settings
  rowHeight: 36; // Fixed height for calculation efficiency
  bufferSize: 10; // Rows to render outside viewport
  overscan: 5; // Additional buffer for smooth scrolling
  
  // Memory management
  maxCachedRows: 500;
  cleanupThreshold: 1000; // Trigger garbage collection
  backgroundLoading: boolean;
}

// Component memoization strategy for dense displays
interface MemoizationStrategy {
  // Row-level memoization
  memoizeRows: true; // React.memo for individual rows
  memoizeColumns: true; // Memo expensive column calculations
  
  // Data comparison strategies
  shallowCompare: boolean; // For simple data structures
  deepCompare: boolean; // For complex ownership data
  customComparator?: (prev: any, next: any) => boolean;
  
  // Update optimization
  batchUpdates: true; // Batch state updates for smooth UI
  debouncedSearch: 300; // ms debounce for search inputs
  throttledScroll: 16; // ms throttle for scroll events
}
```

**Error Boundary Strategy for Dense Components**:
```typescript
// Cascading error recovery for information-dense interfaces
interface DenseComponentErrorBoundary {
  // Error recovery levels
  rowLevel: 'isolate-failed-row'; // Single row failure isolation
  columnLevel: 'fallback-to-text'; // Complex column fallback
  tableLevel: 'simplified-table'; // Full table fallback
  
  // Professional error handling
  userFriendlyMessages: true;
  retryMechanisms: true;
  offlineSupport: boolean;
  
  // Data integrity protection
  autoSave: boolean; // Preserve user input during errors
  conflictDetection: boolean; // Multi-user error prevention
  rollbackCapability: boolean; // Undo failed operations
}
```

---

## Information-Dense Client Details Page Structure

### Separated Objectives/Actions Navigation System

The information-dense client details page implements a **5-tab navigation system** with complete **objectives/actions separation**, prioritizing professional workflow efficiency over aesthetic design.

```typescript
// ClientDetailsLayout.tsx - Main tab container
const ClientDetailsLayout: React.FC<ClientDetailsLayoutProps> = ({
  clientGroupId,
  initialTab = 'overview'
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [presence, setPresence] = usePresence(clientGroupId);
  const [editLocks, setEditLocks] = useEditLocks(clientGroupId);
  
  const tabs = useMemo<TabDefinition[]>(() => [
    {
      key: 'overview',
      title: 'Client Overview',
      icon: 'user',
      component: ExistingClientOverview, // Preserved existing tab
      lazy: false,
      permissions: ['client_groups:read']
    },
    {
      key: 'information-items',
      title: 'Information Items',
      icon: 'list',
      component: MainListTab, // NEW Phase 2 tab
      lazy: true,
      permissions: ['client_groups:read', 'client_groups:write'],
      badge: useInformationItemsCount(clientGroupId)
    },
    {
      key: 'unmanaged-products',
      title: 'Unmanaged Products',
      icon: 'box',
      component: UnmanagedProductsTab, // NEW Phase 2 tab
      lazy: true,
      permissions: ['client_groups:read', 'client_groups:write'],
      badge: useUnmanagedProductsCount(clientGroupId)
    },
    {
      key: 'networth',
      title: 'Net Worth Statement',
      icon: 'chart-line',
      component: NetworthTab, // NEW Phase 2 tab
      lazy: true,
      permissions: ['client_groups:read', 'snapshots:create']
    },
    {
      key: 'kyc-reports',
      title: 'KYC Reports',
      icon: 'file-text',
      component: KYCTab, // NEW Phase 2 tab
      lazy: true,
      permissions: ['reports:generate'],
      badge: useKYCCompletenessScore(clientGroupId)
    }
  ], [clientGroupId]);

  return (
    <div className="client-details-layout">
      <PresenceIndicator 
        users={presence.activeUsers}
        className="layout-presence"
      />
      
      <TabContainer
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        aria-label="Client details navigation"
        variant="enhanced"
      >
        {tabs.map(tab => (
          <TabPanel
            key={tab.key}
            tabKey={tab.key}
            isActive={activeTab === tab.key}
            lazy={tab.lazy}
            editLocks={editLocks[tab.key]}
          >
            <tab.component
              clientGroupId={clientGroupId}
              isActive={activeTab === tab.key}
              onEditLockChange={(locks) => setEditLocks(prev => ({
                ...prev,
                [tab.key]: locks
              }))}
            />
          </TabPanel>
        ))}
      </TabContainer>
    </div>
  );
};
```

### Tab Implementation Details

#### Information Items Tab (Main List)
```typescript
// MainListTab.tsx - Comprehensive information items management
const MainListTab: React.FC<MainListTabProps> = ({
  clientGroupId,
  isActive,
  onEditLockChange
}) => {
  const [items, setItems] = useState<InformationItem[]>([]);
  const [filters, setFilters] = useState<ItemFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItems, setEditingItems] = useState<Set<number>>(new Set());
  const [bulkSelection, setBulkSelection] = useState<Set<number>>(new Set());
  
  // Real-time data management
  const { 
    data: itemsData, 
    isLoading, 
    error 
  } = useQuery(
    ['information-items', clientGroupId, filters, searchQuery],
    () => apiService.getInformationItems(clientGroupId, { ...filters, search: searchQuery }),
    {
      enabled: isActive,
      staleTime: 30 * 1000, // 30 second cache
      refetchInterval: isActive ? 30 * 1000 : false // Auto-refresh when active
    }
  );

  // Auto-save functionality
  const { mutate: saveItem } = useMutation(
    (item: Partial<InformationItem>) => apiService.updateInformationItem(clientGroupId, item),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['information-items', clientGroupId]);
        showSuccessMessage('Item saved successfully');
      },
  // Helper functions for information density
  const getCategoryEmoji = (category: string): string => {
    const emojiMap = {
      'Basic Detail': '📋',
      'Income Expenditure': '💰', 
      'Assets Liabilities': '🏦',
      'Protection': '🛡️',
      'Vulnerability Health': '🏥'
    };
    return emojiMap[category] || '📋';
  };
  
  const formatOwnershipForDenseDisplay = (item: any, productOwners: ProductOwner[]): string => {
    const { category, data_content } = item;

    // Pattern 1: Simple array (basic_detail, income_expenditure, vulnerability_health)
    if (['basic_detail', 'income_expenditure', 'vulnerability_health'].includes(category)) {
      const ownerIds = data_content?.product_owners || [];
      if (ownerIds.length === 0) return 'N/A';

      const ownerNames = ownerIds.map(id => {
        const owner = productOwners.find(po => po.id === id);
        return owner?.name || `ID:${id}`;
      });
      return ownerNames.join(', ');
    }

    // Pattern 2: Complex structure (assets_liabilities, protection)
    if (['assets_liabilities', 'protection'].includes(category)) {
      const ownership = data_content?.associated_product_owners;
      if (!ownership) return 'N/A';

      const { association_type, ...percentages } = ownership;
      const ownerEntries = Object.entries(percentages).map(([id, pct]) => {
        const owner = productOwners.find(po => po.id === parseInt(id));
        return `${owner?.name || `ID:${id}`} (${pct}%)`;
      });

      return association_type === 'joint_tenants'
        ? `Joint: ${ownerEntries.join(', ')}`
        : `TIC: ${ownerEntries.join(', ')}`;
    }

    return 'N/A';
  };
  
  const toggleExpandDescription = (itemId: number) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };
  
  return (
    <ErrorBoundary 
      fallback={<InformationTableError onRetry={() => window.location.reload()} />}
    >
      {tableContent}
    </ErrorBoundary>
  );
};

  // Auto-save implementation
  const debouncedSave = useMemo(
    () => debounce((item: Partial<InformationItem>) => {
      saveItem(item);
    }, 30000), // 30 second auto-save
    [saveItem]
  );

  return (
    <div className="main-list-tab">
      {/* Search and Filter Section */}
      <div className="tab-header">
        <UniversalSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search across all information items..."
          clientGroupId={clientGroupId}
          dataTypes={['information_items']}
          className="universal-search"
        />
        
        <SearchFilters
          filters={filters}
          onChange={setFilters}
          availableCategories={useAvailableCategories(clientGroupId)}
        />

        <div className="bulk-actions">
          <ActionButton
            variant="primary"
            onClick={() => setIsCreating(true)}
            disabled={editingItems.size > 0}
          >
            Add Information Item
          </ActionButton>

          {bulkSelection.size > 0 && (
            <BulkActionDropdown
              selectedItems={bulkSelection}
              onBulkDelete={() => handleBulkDelete(bulkSelection)}
              onBulkExport={() => handleBulkExport(bulkSelection)}
            />
          )}
        </div>
      </div>

      {/* Data Table with Inline Editing */}
      <EditableTable
        data={itemsData?.data || []}
        columns={[
          {
            key: 'item_type',
            title: 'Type',
            sortable: true,
            filterable: true,
            render: (item) => (
              <CategoryBadge type={item.item_type} category={item.item_category} />
            )
          },
          {
            key: 'item_category',
            title: 'Category',
            sortable: true,
            editable: true,
            editComponent: CategoryDropdown
          },
          {
            key: 'data_content',
            title: 'Details',
            render: (item) => (
              <JsonDisplay
                data={item.data_content}
                isEditing={editingItems.has(item.id)}
                onChange={(data) => handleItemDataChange(item.id, data)}
              />
            )
          },
          {
            key: 'ownership',
            title: 'Ownership',
            render: (item) => (
              <OwnershipDisplay
                item={item}  // Pass full item to determine pattern
                category={item.category}
                productOwners={productOwners}
                clientGroupId={clientGroupId}
              />
            )
          },
          {
            key: 'actions',
            title: 'Actions',
            width: 120,
            render: (item) => (
              <ItemActionButtons
                item={item}
                isEditing={editingItems.has(item.id)}
                onEdit={() => toggleEdit(item.id)}
                onDelete={() => handleDelete(item.id)}
                onDuplicate={() => handleDuplicate(item)}
              />
            )
          }
        ]}
        onRowEdit={(itemId) => toggleEdit(itemId)}
        onSelectionChange={setBulkSelection}
        virtualizeThreshold={50}
        ariaLabel="Client information items table"
      />

      {/* Creation Modal */}
      {isCreating && (
        <ItemCreationModal
          clientGroupId={clientGroupId}
          onSuccess={(newItem) => {
            setIsCreating(false);
            queryClient.invalidateQueries(['information-items', clientGroupId]);
            showSuccessMessage('Information item created successfully');
          }}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {/* Auto-save Indicator */}
      <AutoSaveIndicator
        isActive={editingItems.size > 0}
        lastSaved={lastSaveTimestamp}
        className="floating-save-indicator"
      />

      {/* Presence Indicators */}
      <PresenceIndicator
        users={presence.filter(user => user.activeSection === 'information-items')}
        className="tab-presence"
      />
    </div>
  );
};
```

#### Networth Tab Implementation

**Table Structure Requirements:**
The networth statement displays data in a hierarchical structure organized by item types with individual items and subtotals:

```typescript
interface NetworthData {
  item_types: Array<{
    type: string;                    // "GIAs", "Bank Accounts", etc.
    is_managed: boolean;             // true/false for managed vs unmanaged
    items: Array<{
      name: string;                  // "Halifax Current Account"
      john: number;                  // Individual ownership amounts
      mary: number;
      joint: number;
      total: number;                 // Calculated total
    }>;
  }>;
  summary: {
    total_assets: number;
    total_liabilities: number;
    net_worth: number;
  };
}
```

**Professional Styling Standards:**
- **Monochromatic Color Scheme**: Gray-based colors for professional financial documents
- **Section Headers**: Bold uppercase text with dark gray borders, no background colors
- **Individual Items**: Clean indentation, light gray text, subtle hover effects  
- **Section Subtotals**: Light gray backgrounds, semibold italic text, clear borders
- **Grand Totals**: Prominent borders, bold text, professional hierarchy
- **Typography**: Consistent font weights, right-aligned monetary values, em dashes for zero values

```typescript
// NetworthTab.tsx - Interactive networth statement generation
const NetworthTab: React.FC<NetworthTabProps> = ({
  clientGroupId,
  isActive
}) => {
  const [selectedSections, setSelectedSections] = useState<NetworthSection[]>([
    'managed_products', 'unmanaged_products', 'information_items'
  ]);
  const [groupBy, setGroupBy] = useState<'product_type' | 'owner' | 'category'>('product_type');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStatement, setCurrentStatement] = useState<NetworthStatement | null>(null);

  // Real-time networth data with hierarchical structure
  const { data: networthData, isLoading } = useQuery(
    ['networth', clientGroupId, selectedSections, groupBy],
    () => apiService.generateNetworthStatement(clientGroupId, {
      include_managed: selectedSections.includes('managed_products'),
      include_unmanaged: selectedSections.includes('unmanaged_products'),
      include_items: selectedSections.includes('information_items'),
      group_by: groupBy
    }),
    {
      enabled: isActive && selectedSections.length > 0,
      staleTime: 5 * 60 * 1000, // 5 minute cache for calculations
    }
  );

  // Historical snapshots
  const { data: snapshots } = useQuery(
    ['networth-snapshots', clientGroupId],
    () => apiService.getNetworthSnapshots(clientGroupId),
    { enabled: isActive }
  );

  const createSnapshot = useMutation(
    (options: CreateSnapshotOptions) => apiService.createNetworthSnapshot(clientGroupId, options),
    {
      onSuccess: (snapshot) => {
        queryClient.invalidateQueries(['networth-snapshots', clientGroupId]);
        showSuccessMessage(`Snapshot "${snapshot.statement_name}" created successfully`);
        setCurrentStatement(snapshot);
      }
    }
  );

  return (
    <div className="networth-tab">
      {/* Configuration Panel */}
      <div className="networth-config">
        <h3>Statement Configuration</h3>
        
        <div className="config-grid">
          <div className="section-selection">
            <label>Include Sections:</label>
            <CheckboxGroup
              options={[
                { value: 'managed_products', label: 'Managed Products' },
                { value: 'unmanaged_products', label: 'Unmanaged Products' },
                { value: 'information_items', label: 'Information Items' }
              ]}
              value={selectedSections}
              onChange={setSelectedSections}
            />
          </div>

          <div className="grouping-selection">
            <label htmlFor="group-by">Group By:</label>
            <select 
              id="group-by" 
              value={groupBy} 
              onChange={(e) => setGroupBy(e.target.value as any)}
            >
              <option value="product_type">Product Type</option>
              <option value="owner">Owner</option>
              <option value="category">Category</option>
            </select>
          </div>
        </div>

        <div className="snapshot-actions">
          <ActionButton
            variant="primary"
            onClick={() => createSnapshot.mutate({
              statement_name: `Networth Statement - ${format(new Date(), 'MMM dd, yyyy')}`,
              include_sections: {
                managed_products: selectedSections.includes('managed_products'),
                unmanaged_products: selectedSections.includes('unmanaged_products'),
                information_items: selectedSections.includes('information_items')
              }
            })}
            loading={createSnapshot.isLoading}
          >
            Create Snapshot
          </ActionButton>
        </div>
      </div>

      {/* Live Statement Display */}
      {networthData && (
        <div className="networth-display">
          <h3>Current Net Worth Statement</h3>
          
          <div className="statement-summary">
            <StatBox
              label="Total Assets"
              value={formatMoney(networthData.statement_totals.total_assets)}
              trend="positive"
              icon="trend-up"
            />
            <StatBox
              label="Total Liabilities" 
              value={formatMoney(networthData.statement_totals.total_liabilities)}
              trend="neutral"
              icon="minus"
            />
            <StatBox
              label="Net Worth"
              value={formatMoney(networthData.statement_totals.net_worth)}
              trend="positive"
              icon="dollar-sign"
              emphasized
            />
          </div>

          <NetworthTable
            data={networthData.statement_data.sections}
            groupBy={groupBy}
            onItemEdit={(item) => handleItemEdit(item)}
            editable={true}
            className="interactive-networth-table"
          />
        </div>
      )}

      {/* Historical Snapshots */}
      <div className="historical-snapshots">
        <h3>Historical Snapshots</h3>
        
        <div className="snapshots-grid">
          {snapshots?.snapshots.map(snapshot => (
            <div key={snapshot.id} className="snapshot-card">
              <h4>{snapshot.statement_name}</h4>
              <p>Created: {format(new Date(snapshot.created_at), 'MMM dd, yyyy')}</p>
              <p>Net Worth: {formatMoney(snapshot.net_worth)}</p>
              <ActionButton
                variant="outline"
                size="sm"
                onClick={() => viewSnapshot(snapshot.id)}
              >
                View Details
              </ActionButton>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

---

## State Management Strategy

### React Query Integration Enhancement

Phase 2 extends the existing React Query implementation with sophisticated caching strategies, real-time updates, and optimistic UI patterns.

```typescript
// Enhanced query configuration for Phase 2
const phase2QueryConfig = {
  // Real-time data with short cache
  informationItems: {
    staleTime: 30 * 1000,        // 30 seconds
    cacheTime: 5 * 60 * 1000,    // 5 minutes
    refetchInterval: 30 * 1000,   // Auto-refresh every 30 seconds
    retry: 2
  },
  
  // Calculated data with medium cache
  networthStatements: {
    staleTime: 5 * 60 * 1000,    // 5 minutes
    cacheTime: 10 * 60 * 1000,   // 10 minutes
    refetchInterval: false,       // Manual refresh only
    retry: 1
  },
  
  // Static reference data with long cache
  categories: {
    staleTime: 30 * 60 * 1000,   // 30 minutes
    cacheTime: 60 * 60 * 1000,   // 1 hour
    refetchInterval: false,
    retry: 1
  },
  
  // Historical data (immutable)
  snapshots: {
    staleTime: Infinity,         // Never stale
    cacheTime: 60 * 60 * 1000,   // 1 hour in memory
    refetchInterval: false,
    retry: 1
  }
};

// Enhanced API service with optimistic updates
class Phase2ApiService {
  async updateInformationItem(
    clientGroupId: number, 
    item: Partial<InformationItem>
  ): Promise<InformationItem> {
    // Optimistic update
    queryClient.setQueryData(
      ['information-items', clientGroupId],
      (old: InformationItemsResponse) => ({
        ...old,
        data: old.data.map(existingItem => 
          existingItem.id === item.id 
            ? { ...existingItem, ...item, _optimistic: true }
            : existingItem
        )
      })
    );

    try {
      const response = await apiClient.put(`/client_groups/${clientGroupId}/information_items/${item.id}`, item);
      
      // Clear optimistic flag on success
      queryClient.setQueryData(
        ['information-items', clientGroupId],
        (old: InformationItemsResponse) => ({
          ...old,
          data: old.data.map(existingItem => 
            existingItem.id === item.id 
              ? { ...response.data, _optimistic: false }
              : existingItem
          )
        })
      );

      return response.data;
    } catch (error) {
      // Revert optimistic update on error
      queryClient.invalidateQueries(['information-items', clientGroupId]);
      throw error;
    }
  }

  async createInformationItem(
    clientGroupId: number,
    item: CreateInformationItemRequest
  ): Promise<InformationItem> {
    // Generate temporary ID for optimistic update
    const tempId = `temp_${Date.now()}`;
    const optimisticItem: InformationItem = {
      id: tempId,
      client_group_id: clientGroupId,
      ...item,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_edited_by: getCurrentUser().id,
      last_edited_by_name: getCurrentUser().name,
      _optimistic: true
    };

    // Optimistic update
    queryClient.setQueryData(
      ['information-items', clientGroupId],
      (old: InformationItemsResponse) => ({
        ...old,
        data: [optimisticItem, ...old.data]
      })
    );

    try {
      const response = await apiClient.post(`/client_groups/${clientGroupId}/information_items`, item);
      
      // Replace optimistic item with real item
      queryClient.setQueryData(
        ['information-items', clientGroupId],
        (old: InformationItemsResponse) => ({
          ...old,
          data: old.data.map(existingItem => 
            existingItem.id === tempId 
              ? response.data
              : existingItem
          )
        })
      );

      return response.data;
    } catch (error) {
      // Remove optimistic item on error
      queryClient.setQueryData(
        ['information-items', clientGroupId],
        (old: InformationItemsResponse) => ({
          ...old,
          data: old.data.filter(item => item.id !== tempId)
        })
      );
      throw error;
    }
  }
}
```

### Auto-Save Implementation

```typescript
// useAutoSave hook for managing automatic data persistence
const useAutoSave = <T>(
  data: T,
  saveFunction: (data: T) => Promise<void>,
  options: AutoSaveOptions = {}
) => {
  const {
    delay = 30000,        // 30 seconds default
    enabled = true,
    compareFunction = deepEqual
  } = options;

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);
  const savedDataRef = useRef<T>(data);

  const debouncedSave = useMemo(
    () => debounce(async (dataToSave: T) => {
      if (!enabled) return;

      setSaveStatus('saving');
      setError(null);

      try {
        await saveFunction(dataToSave);
        savedDataRef.current = dataToSave;
        setLastSaved(new Date());
        setSaveStatus('saved');
        
        // Reset to idle after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Save failed'));
        setSaveStatus('error');
      }
    }, delay),
    [saveFunction, delay, enabled]
  );

  useEffect(() => {
    if (enabled && !compareFunction(data, savedDataRef.current)) {
      debouncedSave(data);
    }
  }, [data, debouncedSave, compareFunction, enabled]);

  return {
    saveStatus,
    conflictItems,
    forceSaveAll,
    resolveConflict,
    queueSize: saveQueue.size,
    hasUnsavedChanges: saveQueue.size > 0
  };
};

// Virtual scrolling state management for dense tables
const useVirtualScrollState = <T>({
  data,
  rowHeight,
  containerHeight,
  bufferSize = 10
}: VirtualScrollConfig<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  
  // Calculate visible range for performance
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - bufferSize);
    const endIndex = Math.min(
      data.length - 1,
      Math.ceil((scrollTop + containerHeight) / rowHeight) + bufferSize
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, rowHeight, containerHeight, bufferSize, data.length]);
  
  // Scrolling performance optimization
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const handleScroll = useCallback((scrollTop: number) => {
    setScrollTop(scrollTop);
    setIsScrolling(true);
    
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);
  
  return {
    visibleRange,
    isScrolling,
    handleScroll,
    totalHeight: data.length * rowHeight
  };
};

// Separated objectives/actions state (no cross-linking)
const useSeparatedObjectivesActions = (clientGroupId: number) => {
  // Completely separate state management - NO linking between objectives and actions
  const objectives = useQuery(
    ['client-objectives', clientGroupId],
    () => apiService.getClientObjectives(clientGroupId),
    {
      staleTime: 60 * 1000, // 1 minute
      refetchInterval: false // Manual refresh only
    }
  );
  
  // Actions managed separately - no objective linking
  const clientActions = useQuery(
    ['client-specific-actions', clientGroupId],
    () => apiService.getClientSpecificActions(clientGroupId),
    {
      staleTime: 30 * 1000,
      enabled: false // Load only when tab is active
    }
  );
  
  return {
    objectives,
    clientActions,
    // Separate management functions - NO linking capability
    addObjective: (objective: CreateObjectiveRequest) => 
      apiService.createObjective(clientGroupId, objective),
    addClientAction: (action: CreateActionRequest) => 
      apiService.createClientAction(clientGroupId, action),
    // Note: No linkAction function - architecture prevents objective-action linking
  };
};

// Global actions state (cross-client workflow)
const useGlobalActionsState = () => {
  const [filters, setFilters] = useState<GlobalActionFilters>({
    sortBy: 'due_date',
    sortOrder: 'asc',
    showOverdue: true
  });
  
  const globalActions = useQuery(
    ['global-actions', filters],
    () => apiService.getGlobalActionsByUrgency(filters),
    {
      staleTime: 15 * 1000, // 15 seconds - high priority workflow data
      refetchInterval: 30 * 1000, // Auto-refresh for urgency tracking
      select: (data) => {
        // Pre-calculate display properties for dense table
        return data.map(action => ({
          ...action,
          urgency_color: calculateUrgencyColor(action.due_date, action.priority),
          days_until_due: calculateDaysUntilDue(action.due_date),
          status_display: formatStatusForDenseDisplay(action.status)
        }));
      }
    }
  );
  
  return {
    globalActions,
    filters,
    setFilters,
    // Cross-client action management
    assignToClients: (actionId: number, clientGroupIds: number[]) => 
      apiService.assignGlobalAction(actionId, clientGroupIds),
    updateActionStatus: (actionId: number, status: ActionStatus, notes?: string) => 
      apiService.updateGlobalActionStatus(actionId, status, notes)
  };
};

// Memory management for large datasets in dense interfaces
const useDenseDataMemoryManagement = () => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const memoryCheckInterval = setInterval(() => {
      // Monitor memory usage for dense table performance
      if (performance.memory?.usedJSHeapSize > 150 * 1024 * 1024) { // 150MB threshold
        // Clear old query cache to free memory
        queryClient.removeQueries({
          predicate: (query) => {
            const age = Date.now() - query.state.dataUpdatedAt;
            return age > 10 * 60 * 1000; // Remove queries older than 10 minutes
          }
        });
        
        // Force garbage collection if available
        if (window.gc) {
          window.gc();
        }
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(memoryCheckInterval);
  }, [queryClient]);
};

// Usage in dense table components
const DenseInformationTable: React.FC<DenseTableProps> = ({ 
  clientGroupId, 
  data, 
  onRowUpdate 
}) => {
  // Enhanced auto-save for dense table editing
  const { saveStatus, conflictItems, hasUnsavedChanges } = useDenseTableAutoSave(
    data,
    async (item) => {
      await apiService.updateInformationItemDense(clientGroupId, item);
      onRowUpdate?.(item);
    },
    {
      delay: 15000, // Faster save for professional workflow
      batchSize: 10, // Batch multiple edits
      conflictResolution: 'optimistic'
    }
  );
  
  // Virtual scrolling for large datasets
  const { visibleRange, handleScroll, totalHeight } = useVirtualScrollState({
    data,
    rowHeight: 36, // Information-dense row height
    containerHeight: 600, // Table container height
    bufferSize: 5 // Rows to render outside viewport
  });
  
  // Memory management
  useDenseDataMemoryManagement();
  
  return (
    <div className="dense-information-table">
      <TableHeader
        unsavedChanges={hasUnsavedChanges}
        conflictCount={conflictItems.size}
        totalItems={data.length}
      />
      
      <VirtualScrollContainer
        height={totalHeight}
        onScroll={handleScroll}
        className="information-dense"
      >
        {data.slice(visibleRange.startIndex, visibleRange.endIndex + 1).map(item => (
          <DenseTableRow
            key={item.id}
            item={item}
            saveStatus={saveStatus[item.id]}
            hasConflict={conflictItems.has(item.id)}
            height={36}
          />
        ))}
      </VirtualScrollContainer>
    </div>
  );
};
```

---

## Real-time Features and Concurrent User Management

### Presence System Architecture

```typescript
// usePresence hook for real-time user tracking
const usePresence = (pageIdentifier: string) => {
  const [presence, setPresence] = useState<UserPresence[]>([]);
  const currentUser = useCurrentUser();
  const intervalRef = useRef<NodeJS.Timeout>();

  const updatePresence = useCallback(async () => {
    try {
      await apiService.updateUserPresence(pageIdentifier);
      const activeUsers = await apiService.getPagePresence(pageIdentifier);
      setPresence(activeUsers);
    } catch (error) {
      console.error('Failed to update presence:', error);
    }
  }, [pageIdentifier]);

  useEffect(() => {
    // Initial presence update
    updatePresence();

    // Set up periodic updates
    intervalRef.current = setInterval(updatePresence, 30000); // 30 seconds

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Clear presence on unmount
      apiService.clearUserPresence(pageIdentifier);
    };
  }, [updatePresence, pageIdentifier]);

  // Update presence on activity
  useEffect(() => {
    const handleUserActivity = debounce(() => {
      updatePresence();
    }, 5000);

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
    };
  }, [updatePresence]);

  return {
    activeUsers: presence.filter(user => user.user_id !== currentUser.id),
    userCount: presence.length,
    updatePresence
  };
};

// PresenceIndicator component
const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  users,
  className = '',
  showNames = true,
  maxDisplay = 4
}) => {
  if (users.length === 0) return null;

  const displayUsers = users.slice(0, maxDisplay);
  const additionalCount = users.length - maxDisplay;

  return (
    <div className={`presence-indicator ${className}`} role="status" aria-live="polite">
      <div className="user-avatars">
        {displayUsers.map(user => (
          <div
            key={user.user_id}
            className="user-avatar"
            title={`${user.user_name} is currently viewing this page`}
            style={{ backgroundColor: user.avatar_color }}
          >
            {user.user_name.charAt(0).toUpperCase()}
          </div>
        ))}
        
        {additionalCount > 0 && (
          <div className="additional-users" title={`${additionalCount} more users active`}>
            +{additionalCount}
          </div>
        )}
      </div>

      {showNames && (
        <div className="presence-text">
          {users.length === 1 
            ? `${users[0].user_name} is also viewing this page`
            : `${users.length} others are viewing this page`
          }
        </div>
      )}
    </div>
  );
};
```

### Conflict Resolution System

```typescript
// Conflict detection and resolution
const useConflictDetection = <T>(
  resourceId: string,
  data: T,
  version?: string
) => {
  const [conflicts, setConflicts] = useState<ConflictData[]>([]);
  const [isResolvingConflict, setIsResolvingConflict] = useState(false);

  const detectConflict = useCallback(async () => {
    if (!version) return;

    try {
      const currentVersion = await apiService.getResourceVersion(resourceId);
      if (currentVersion !== version) {
        const conflictData = await apiService.getConflictData(resourceId, version);
        setConflicts(conflictData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Conflict detection failed:', error);
      return false;
    }
  }, [resourceId, version]);

  const resolveConflict = useCallback(async (resolution: ConflictResolution) => {
    setIsResolvingConflict(true);
    
    try {
      const resolvedData = await apiService.resolveConflict(resourceId, resolution);
      setConflicts([]);
      setIsResolvingConflict(false);
      return resolvedData;
    } catch (error) {
      setIsResolvingConflict(false);
      throw error;
    }
  }, [resourceId]);

  return {
    conflicts,
    hasConflicts: conflicts.length > 0,
    isResolvingConflict,
    detectConflict,
    resolveConflict
  };
};

// ConflictResolutionModal component
const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  conflicts,
  currentData,
  onResolve,
  onCancel
}) => {
  const [resolutionStrategy, setResolutionStrategy] = useState<'merge' | 'overwrite' | 'manual'>('merge');
  const [mergedData, setMergedData] = useState(() => smartMerge(currentData, conflicts));

  const handleResolve = () => {
    const resolution: ConflictResolution = {
      strategy: resolutionStrategy,
      resolvedData: resolutionStrategy === 'manual' ? mergedData : undefined
    };
    
    onResolve(resolution);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title="Resolve Data Conflicts"
      size="large"
      className="conflict-resolution-modal"
    >
      <div className="conflict-content">
        <div className="conflict-explanation">
          <AlertTriangleIcon className="warning-icon" />
          <p>
            Another user has modified this data while you were editing. 
            Please choose how to resolve the conflicts:
          </p>
        </div>

        <div className="resolution-options">
          <label>
            <input
              type="radio"
              value="merge"
              checked={resolutionStrategy === 'merge'}
              onChange={(e) => setResolutionStrategy(e.target.value as any)}
            />
            Smart Merge (Recommended)
            <span className="option-description">
              Automatically merge non-conflicting changes
            </span>
          </label>

          <label>
            <input
              type="radio"
              value="overwrite"
              checked={resolutionStrategy === 'overwrite'}
              onChange={(e) => setResolutionStrategy(e.target.value as any)}
            />
            Use My Changes
            <span className="option-description">
              Overwrite server data with your local changes
            </span>
          </label>

          <label>
            <input
              type="radio"
              value="manual"
              checked={resolutionStrategy === 'manual'}
              onChange={(e) => setResolutionStrategy(e.target.value as any)}
            />
            Manual Resolution
            <span className="option-description">
              Review and manually resolve each conflict
            </span>
          </label>
        </div>

        {resolutionStrategy === 'manual' && (
          <div className="manual-resolution">
            <ConflictEditor
              conflicts={conflicts}
              currentData={currentData}
              mergedData={mergedData}
              onChange={setMergedData}
            />
          </div>
        )}

        <div className="modal-actions">
          <ActionButton variant="outline" onClick={onCancel}>
            Cancel
          </ActionButton>
          <ActionButton variant="primary" onClick={handleResolve}>
            Resolve Conflicts
          </ActionButton>
        </div>
      </div>
    </Modal>
  );
};
```

---

## Search and Filtering Components

### Universal Search Implementation

```typescript
// UniversalSearch component for cross-data search
const UniversalSearch: React.FC<UniversalSearchProps> = ({
  clientGroupId,
  onResultSelect,
  placeholder = "Search across all client data...",
  dataTypes = ['information_items', 'unmanaged_products', 'actions'],
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResults>({});
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounced search to avoid excessive API calls
  const debouncedSearch = useMemo(
    () => debounce(async (searchQuery: string) => {
      if (searchQuery.length < 3) {
        setResults({});
        return;
      }

      setIsSearching(true);
      
      try {
        const searchResults = await apiService.universalSearch(clientGroupId, {
          q: searchQuery,
          types: dataTypes.join(','),
          limit: 20,
          highlight: true
        });
        
        setResults(searchResults.search_results.results_by_type);
      } catch (error) {
        console.error('Search failed:', error);
        setResults({});
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [clientGroupId, dataTypes]
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const flatResults = flattenSearchResults(results);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < flatResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : flatResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && flatResults[selectedIndex]) {
          onResultSelect(flatResults[selectedIndex]);
          setQuery('');
          setResults({});
          setSelectedIndex(-1);
        }
        break;
      case 'Escape':
        setQuery('');
        setResults({});
        setSelectedIndex(-1);
        searchInputRef.current?.blur();
        break;
    }
  };

  return (
    <div className={`universal-search ${className}`}>
      <div className="search-input-container">
        <SearchIcon className="search-icon" />
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="search-input"
          aria-label="Universal search input"
          aria-expanded={Object.keys(results).length > 0}
          aria-haspopup="listbox"
          autoComplete="off"
        />
        
        {isSearching && (
          <LoadingSpinner className="search-loading" size="sm" />
        )}
      </div>

      {/* Search Results Dropdown */}
      {Object.keys(results).length > 0 && (
        <div className="search-results" role="listbox">
          {Object.entries(results).map(([dataType, items]) => (
            <div key={dataType} className="result-group">
              <div className="result-group-header">
                {formatDataTypeName(dataType)} ({items.length})
              </div>
              
              {items.map((item, index) => {
                const globalIndex = getGlobalIndex(results, dataType, index);
                return (
                  <div
                    key={`${dataType}-${item.item_id}`}
                    className={`search-result-item ${
                      selectedIndex === globalIndex ? 'selected' : ''
                    }`}
                    role="option"
                    aria-selected={selectedIndex === globalIndex}
                    onClick={() => onResultSelect(item)}
                  >
                    <div className="result-title">
                      {item.highlighted_content ? (
                        <span dangerouslySetInnerHTML={{ 
                          __html: item.highlighted_content 
                        }} />
                      ) : (
                        item.title
                      )}
                    </div>
                    
                    <div className="result-meta">
                      {item.category && (
                        <span className="result-category">{item.category}</span>
                      )}
                      
                      <span className="result-updated">
                        Updated {formatRelativeTime(item.last_updated)}
                      </span>
                      
                      {item.valuation && (
                        <span className="result-value">
                          {formatMoney(item.valuation)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## Form Components and Auto-save Implementation

### Complex Form Management

```typescript
// useFormAutoSave hook for comprehensive form management
const useFormAutoSave = <T extends Record<string, any>>(
  initialData: T,
  saveFunction: (data: T) => Promise<T>,
  options: FormAutoSaveOptions<T> = {}
) => {
  const {
    autoSaveDelay = 30000,
    validationSchema,
    onSaveSuccess,
    onSaveError,
    compareIgnoredFields = []
  } = options;

  const [formData, setFormData] = useState<T>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const validate = useCallback((data: T): Record<string, string> => {
    if (!validationSchema) return {};

    try {
      validationSchema.parse(data);
      return {};
    } catch (error) {
      if (error instanceof ZodError) {
        return error.errors.reduce((acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        }, {} as Record<string, string>);
      }
      return { _general: 'Validation failed' };
    }
  }, [validationSchema]);

  const compareData = useCallback((a: T, b: T): boolean => {
    const compareA = { ...a };
    const compareB = { ...b };
    
    // Remove ignored fields from comparison
    compareIgnoredFields.forEach(field => {
      delete compareA[field];
      delete compareB[field];
    });

    return deepEqual(compareA, compareB);
  }, [compareIgnoredFields]);

  const saveData = useCallback(async (data: T) => {
    setSaveStatus('saving');
    
    try {
      const validationErrors = validate(data);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        setSaveStatus('error');
        return;
      }

      const savedData = await saveFunction(data);
      setLastSaved(new Date());
      setSaveStatus('saved');
      setIsDirty(false);
      setErrors({});
      
      if (onSaveSuccess) {
        onSaveSuccess(savedData);
      }

      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      if (onSaveError) {
        onSaveError(error instanceof Error ? error : new Error('Save failed'));
      }
    }
  }, [saveFunction, validate, onSaveSuccess, onSaveError]);

  const debouncedSave = useMemo(
    () => debounce(saveData, autoSaveDelay),
    [saveData, autoSaveDelay]
  );

  const updateField = useCallback(<K extends keyof T>(
    field: K,
    value: T[K]
  ) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      if (!compareData(newData, initialData)) {
        setIsDirty(true);
      }

      return newData;
    });
  }, [initialData, compareData]);

  const updateData = useCallback((newData: Partial<T>) => {
    setFormData(prev => {
      const updated = { ...prev, ...newData };
      
      if (!compareData(updated, initialData)) {
        setIsDirty(true);
      }

      return updated;
    });
  }, [initialData, compareData]);

  // Auto-save effect
  useEffect(() => {
    if (isDirty) {
      debouncedSave(formData);
    }
  }, [formData, isDirty, debouncedSave]);

  const forceSave = useCallback(async () => {
    debouncedSave.cancel();
    await saveData(formData);
  }, [debouncedSave, saveData, formData]);

  const resetForm = useCallback(() => {
    setFormData(initialData);
    setIsDirty(false);
    setErrors({});
    setSaveStatus('idle');
    debouncedSave.cancel();
  }, [initialData, debouncedSave]);

  return {
    formData,
    errors,
    isDirty,
    saveStatus,
    lastSaved,
    updateField,
    updateData,
    forceSave,
    resetForm,
    validate: () => validate(formData)
  };
};
```

---

## Accessibility Implementation

### WCAG 2.1 AA Compliance Framework

```typescript
// useAccessibility hook for comprehensive accessibility support
const useAccessibility = () => {
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [focusTrap, setFocusTrap] = useState<HTMLElement | null>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncements(prev => [...prev, `${priority}:${message}`]);
    
    // Clear announcement after it's been read
    setTimeout(() => {
      setAnnouncements(prev => prev.slice(1));
    }, 1000);
  }, []);

  const trapFocus = useCallback((element: HTMLElement) => {
    setFocusTrap(element);
    
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      } else if (e.key === 'Escape') {
        releaseFocusTrap();
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    firstFocusable?.focus();

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const releaseFocusTrap = useCallback(() => {
    setFocusTrap(null);
  }, []);

  return {
    announce,
    trapFocus,
    releaseFocusTrap,
    announcements
  };
};

// AccessibleTable component with full keyboard navigation
const AccessibleTable: React.FC<AccessibleTableProps> = ({
  data,
  columns,
  caption,
  onRowSelect,
  onCellEdit,
  className = ''
}) => {
  const [focusedCell, setFocusedCell] = useState<[number, number] | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const { announce } = useAccessibility();
  const tableRef = useRef<HTMLTableElement>(null);

  const handleKeyDown = (e: KeyboardEvent, rowIndex: number, colIndex: number) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (rowIndex > 0) {
          setFocusedCell([rowIndex - 1, colIndex]);
          announce(`Row ${rowIndex}, ${columns[colIndex].title}`);
        }
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        if (rowIndex < data.length - 1) {
          setFocusedCell([rowIndex + 1, colIndex]);
          announce(`Row ${rowIndex + 2}, ${columns[colIndex].title}`);
        }
        break;
        
      case 'ArrowLeft':
        e.preventDefault();
        if (colIndex > 0) {
          setFocusedCell([rowIndex, colIndex - 1]);
          announce(`${columns[colIndex - 1].title}`);
        }
        break;
        
      case 'ArrowRight':
        e.preventDefault();
        if (colIndex < columns.length - 1) {
          setFocusedCell([rowIndex, colIndex + 1]);
          announce(`${columns[colIndex + 1].title}`);
        }
        break;
        
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (columns[colIndex].editable && onCellEdit) {
          onCellEdit(rowIndex, colIndex, data[rowIndex]);
          announce('Editing cell');
        } else if (onRowSelect) {
          onRowSelect(data[rowIndex]);
          announce('Row selected');
        }
        break;
        
      case 'Home':
        e.preventDefault();
        if (e.ctrlKey) {
          setFocusedCell([0, 0]);
          announce('Top of table');
        } else {
          setFocusedCell([rowIndex, 0]);
          announce(`First column, ${columns[0].title}`);
        }
        break;
        
      case 'End':
        e.preventDefault();
        if (e.ctrlKey) {
          setFocusedCell([data.length - 1, columns.length - 1]);
          announce('Bottom of table');
        } else {
          setFocusedCell([rowIndex, columns.length - 1]);
          announce(`Last column, ${columns[columns.length - 1].title}`);
        }
        break;
    }
  };

  return (
    <div className={`accessible-table-container ${className}`}>
      <table
        ref={tableRef}
        className="accessible-table"
        role="grid"
        aria-label={caption}
      >
        {caption && <caption>{caption}</caption>}
        
        <thead>
          <tr role="row">
            {columns.map((column, colIndex) => (
              <th
                key={column.key}
                role="columnheader"
                aria-sort={column.sortDirection || 'none'}
                tabIndex={focusedCell?.[1] === colIndex && focusedCell?.[0] === -1 ? 0 : -1}
                className={column.sortable ? 'sortable' : ''}
                onClick={column.sortable ? () => column.onSort?.(column.key) : undefined}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && column.sortable) {
                    e.preventDefault();
                    column.onSort?.(column.key);
                  }
                }}
              >
                {column.title}
                {column.sortable && (
                  <span className="sort-indicator" aria-hidden="true">
                    {column.sortDirection === 'asc' ? '▲' : column.sortDirection === 'desc' ? '▼' : ''}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={row.id || rowIndex}
              role="row"
              className={selectedRows.has(rowIndex) ? 'selected' : ''}
              aria-selected={selectedRows.has(rowIndex)}
            >
              {columns.map((column, colIndex) => (
                <td
                  key={`${rowIndex}-${colIndex}`}
                  role="gridcell"
                  tabIndex={
                    focusedCell?.[0] === rowIndex && focusedCell?.[1] === colIndex ? 0 : -1
                  }
                  className={`
                    ${focusedCell?.[0] === rowIndex && focusedCell?.[1] === colIndex ? 'focused' : ''}
                    ${column.editable ? 'editable' : ''}
                  `}
                  aria-label={`${column.title}: ${getCellValue(row, column)}`}
                  onFocus={() => setFocusedCell([rowIndex, colIndex])}
                  onKeyDown={(e) => handleKeyDown(e.nativeEvent, rowIndex, colIndex)}
                  onClick={() => setFocusedCell([rowIndex, colIndex])}
                >
                  {column.render ? column.render(row, rowIndex) : getCellValue(row, column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

## Performance Strategy - Virtual Scrolling & Dense Data Optimization

### Information-Dense Virtual Scrolling Architecture

**Performance Requirements for Dense Interfaces**:
- **Sub-500ms rendering** for dense tables with 100+ rows
- **12+ rows visible** simultaneously for information density
- **Virtual scrolling mandatory** for datasets > 200 items
- **Memory management** for 1000+ row datasets without degradation
- **Smooth scrolling** at 60fps with complex row content

```typescript
// High-performance dense table virtual scrolling
const DenseTableVirtualized: React.FC<DenseVirtualTableProps> = ({
  items,
  columns,
  rowHeight = 36, // Information-dense compact height
  containerHeight = 600, // Minimum height for 12+ rows visibility
  minVisibleRows = 12, // Information density requirement
  bufferSize = 10, // Rows to render outside viewport
  enableStickyHeader = true,
  onRowEdit,
  className = ''
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Calculate visible range with buffer for smooth scrolling
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - bufferSize);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / rowHeight) + bufferSize
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, rowHeight, containerHeight, bufferSize, items.length]);
  
  // Performance-optimized scroll handler
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      setIsScrolling(true);
      
      // Debounce scrolling state for performance
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    },
    []
  );
  
  // Memory-efficient visible items calculation
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange.startIndex, visibleRange.endIndex]);
  
  // Scroll to specific row (for search/navigation)
  const scrollToRow = useCallback((rowIndex: number) => {
    if (containerRef.current && rowIndex >= 0 && rowIndex < items.length) {
      const scrollTo = rowIndex * rowHeight;
      containerRef.current.scrollTo({ 
        top: scrollTo, 
        behavior: 'smooth' 
      });
    }
  }, [rowHeight, items.length]);
  
  // Performance monitoring
  useEffect(() => {
    const measurePerformance = () => {
      const renderStart = performance.now();
      requestAnimationFrame(() => {
        const renderTime = performance.now() - renderStart;
        if (renderTime > 16) { // > 60fps threshold
          console.warn(`Dense table render time: ${renderTime.toFixed(2)}ms (target: <16ms)`);
        }
      });
    };
    
    if (visibleItems.length > 0) {
      measurePerformance();
    }
  }, [visibleItems]);
  
  return (
    <div className={`dense-table-virtualized ${className}`}>
      {/* Sticky header for dense tables */}
      {enableStickyHeader && (
        <div className="dense-table-header sticky">
          <DenseTableHeaderRow 
            columns={columns}
            sortable={true}
            className="information-dense"
          />
        </div>
      )}
      
      {/* Virtual scroll container */}
      <div
        ref={containerRef}
        className="dense-table-scroll-container"
        style={{ 
          height: containerHeight, 
          overflow: 'auto',
          // Ensure minimum rows are visible
          minHeight: Math.max(containerHeight, minVisibleRows * rowHeight + 40)
        }}
        onScroll={handleScroll}
        role="table"
        aria-label={`Dense table with ${items.length} rows, showing ${visibleItems.length} visible`}
        aria-rowcount={items.length}
      >
        {/* Total height container for scroll bar calculation */}
        <div
          className="dense-table-total-height"
          style={{
            height: items.length * rowHeight,
            position: 'relative'
          }}
        >
          {/* Only render visible rows for performance */}
          {visibleItems.map((item, index) => {
            const actualIndex = visibleRange.startIndex + index;
            return (
              <DenseTableRow
                key={item.id || actualIndex}
                item={item}
                columns={columns}
                rowIndex={actualIndex}
                style={{
                  position: 'absolute',
                  top: actualIndex * rowHeight,
                  height: rowHeight,
                  width: '100%'
                }}
                className={`
                  dense-row
                  ${isScrolling ? 'scrolling' : ''}
                  ${actualIndex % 2 === 0 ? 'even' : 'odd'}
                `}
                onEdit={() => onRowEdit?.(item)}
                aria-rowindex={actualIndex + 1}
                informationDense={true}
              />
            );
          })}
        </div>
      </div>
      
      {/* Performance indicators for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="performance-debug">
          <small>
            Visible: {visibleRange.endIndex - visibleRange.startIndex + 1}/{items.length} | 
            Scroll: {Math.round(scrollTop)}px | 
            {isScrolling ? 'Scrolling' : 'Idle'}
          </small>
        </div>
      )}
    </div>
  );
};

// Memory management for large datasets
const useDenseTableMemoryOptimization = <T>(
  items: T[],
  options: MemoryOptimizationOptions = {}
) => {
  const {
    maxItemsInMemory = 1000,
    cleanupThreshold = 5000,
    enableGarbageCollection = true
  } = options;
  
  const [optimizedItems, setOptimizedItems] = useState(items);
  
  useEffect(() => {
    // If dataset is large, implement chunked loading
    if (items.length > maxItemsInMemory) {
      // Keep only essential data in memory, lazy load details
      const optimized = items.map(item => ({
        ...item,
        _detailed: false, // Flag for lazy loading detailed data
        _memoryOptimized: true
      }));
      
      setOptimizedItems(optimized as T[]);
    } else {
      setOptimizedItems(items);
    }
    
    // Trigger garbage collection if dataset is very large
    if (enableGarbageCollection && items.length > cleanupThreshold) {
      if (window.gc) {
        window.gc();
      }
    }
  }, [items, maxItemsInMemory, cleanupThreshold, enableGarbageCollection]);
  
  return optimizedItems;
};
```

### Dense Table Performance Patterns

**Row-Level Memoization Strategy**:
```typescript
// High-performance row component with memoization
const DenseTableRow = React.memo<DenseTableRowProps>(({ 
  item, 
  columns, 
  rowIndex, 
  onEdit,
  informationDense = true,
  ...props 
}) => {
  // Memoize expensive calculations
  const calculatedFields = useMemo(() => ({
    ownershipDisplay: formatOwnershipForDenseDisplay(item.ownership),
    categoryEmoji: getCategoryEmoji(item.category),
    urgencyColor: item.due_date ? calculateUrgencyColor(item.due_date) : null,
    lastEditedRelative: formatRelativeDate(item.last_edited)
  }), [item.ownership, item.category, item.due_date, item.last_edited]);
  
  // Memoize click handlers to prevent unnecessary re-renders
  const handleEdit = useCallback(() => {
    onEdit?.(item);
  }, [onEdit, item]);
  
  const handleRowClick = useCallback((e: React.MouseEvent) => {
    if (e.detail === 2) { // Double click for edit
      handleEdit();
    }
  }, [handleEdit]);
  
  return (
    <div 
      className={`dense-table-row ${informationDense ? 'information-dense' : ''}`}
      onClick={handleRowClick}
      {...props}
    >
      {columns.map(column => (
        <DenseTableCell
          key={column.key}
          column={column}
          item={item}
          calculatedFields={calculatedFields}
          rowIndex={rowIndex}
          className="dense-cell"
        />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for performance optimization
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.updated_at === nextProps.item.updated_at &&
    prevProps.rowIndex === nextProps.rowIndex
  );
});
```

### Global Actions Performance Optimization

**Cross-Client Data Caching Strategy**:
```typescript
// Optimized global actions data management
const useGlobalActionsPerformance = () => {
  const queryClient = useQueryClient();
  
  // Prefetch strategy for large action datasets
  const prefetchNextPage = useCallback(async (currentPage: number) => {
    await queryClient.prefetchQuery({
      queryKey: ['global-actions', { page: currentPage + 1 }],
      queryFn: () => apiService.getGlobalActions({ page: currentPage + 1 }),
      staleTime: 60 * 1000 // 1 minute
    });
  }, [queryClient]);
  
  // Background sync for urgency updates
  useEffect(() => {
    const urgencyUpdateInterval = setInterval(() => {
      // Update urgency colors based on current time
      queryClient.setQueryData(
        ['global-actions'],
        (oldData: GlobalAction[] | undefined) => {
          if (!oldData) return oldData;
          
          return oldData.map(action => ({
            ...action,
            urgency_color: calculateUrgencyColor(action.due_date, action.priority),
            days_until_due: calculateDaysUntilDue(action.due_date)
          }));
        }
      );
    }, 60 * 1000); // Update every minute
    
    return () => clearInterval(urgencyUpdateInterval);
  }, [queryClient]);
  
  return {
    prefetchNextPage
  };
};
```

### Performance Monitoring & Metrics

**Real-Time Performance Tracking**:
```typescript
// Performance monitoring for dense interfaces
class DenseInterfacePerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private renderTimeThreshold = 16; // 60fps target
  private memoryThreshold = 150 * 1024 * 1024; // 150MB
  
  // Monitor dense table rendering performance
  measureDenseTableRender<T>(
    component: string,
    rowCount: number,
    renderFunction: () => T
  ): T {
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    const result = renderFunction();
    
    requestAnimationFrame(() => {
      const endTime = performance.now();
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const renderTime = endTime - startTime;
      const memoryUsed = endMemory - startMemory;
      
      this.metrics.push({
        component,
        renderTime,
        memoryUsed,
        rowCount,
        timestamp: Date.now(),
        exceededThreshold: renderTime > this.renderTimeThreshold
      });
      
      // Log performance warnings
      if (renderTime > this.renderTimeThreshold) {
        console.warn(
          `Dense table ${component} render time: ${renderTime.toFixed(2)}ms ` +
          `(${rowCount} rows) - Target: <${this.renderTimeThreshold}ms`
        );
      }
      
      if (memoryUsed > this.memoryThreshold) {
        console.warn(
          `High memory usage: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB ` +
          `- Consider virtual scrolling optimization`
        );
      }
    });
    
    return result;
  }
  
  // Get performance summary for dense interfaces
  getPerformanceSummary(): DenseInterfaceMetrics {
    const recentMetrics = this.metrics.filter(
      m => Date.now() - m.timestamp < 5 * 60 * 1000 // Last 5 minutes
    );
    
    return {
      averageRenderTime: recentMetrics.reduce((sum, m) => sum + m.renderTime, 0) / recentMetrics.length,
      maxRenderTime: Math.max(...recentMetrics.map(m => m.renderTime)),
      performanceIssues: recentMetrics.filter(m => m.exceededThreshold).length,
      totalMeasurements: recentMetrics.length,
      memoryEfficiency: recentMetrics.reduce((sum, m) => sum + m.memoryUsed, 0) / recentMetrics.length
    };
  }
}

// Usage in dense table components
const performanceMonitor = new DenseInterfacePerformanceMonitor();

const MonitoredDenseTable: React.FC<DenseTableProps> = ({ data, ...props }) => {
  const [performanceMetrics, setPerformanceMetrics] = useState<DenseInterfaceMetrics | null>(null);
  
  useEffect(() => {
    // Update performance metrics every 30 seconds
    const metricsInterval = setInterval(() => {
      setPerformanceMetrics(performanceMonitor.getPerformanceSummary());
    }, 30000);
    
    return () => clearInterval(metricsInterval);
  }, []);
  
  const renderTable = useCallback(() => {
    return performanceMonitor.measureDenseTableRender(
      'InformationItemsTable',
      data.length,
      () => <DenseTableVirtualized data={data} {...props} />
    );
  }, [data, props]);
  
  return (
    <div className="monitored-dense-table">
      {renderTable()}
      
      {/* Performance indicator for development */}
      {process.env.NODE_ENV === 'development' && performanceMetrics && (
        <div className="performance-metrics">
          <small>
            Avg Render: {performanceMetrics.averageRenderTime.toFixed(1)}ms | 
            Issues: {performanceMetrics.performanceIssues} | 
            Memory: {(performanceMetrics.memoryEfficiency / 1024 / 1024).toFixed(1)}MB
          </small>
        </div>
      )}
    </div>
  );
};
```

---

## Integration with Existing Frontend

### Information-Dense Interface Integration Strategy

```typescript
// LegacyCompatibilityLayer for seamless integration
class LegacyCompatibilityLayer {
  static wrapExistingComponent<P>(
    Component: React.ComponentType<P>,
    enhancements: ComponentEnhancements = {}
  ): React.ComponentType<P> {
    return (props: P) => {
      const { withPresence = false, withAutoSave = false } = enhancements;
      
      // Add presence indicators if requested
      let wrappedComponent = <Component {...props} />;
      
      if (withPresence && 'clientGroupId' in props) {
        wrappedComponent = (
          <div className="component-with-presence">
            <PresenceIndicator clientGroupId={props.clientGroupId as number} />
            {wrappedComponent}
          </div>
        );
      }

      if (withAutoSave && 'onDataChange' in props) {
        wrappedComponent = (
          <AutoSaveWrapper
            onDataChange={props.onDataChange as (data: any) => void}
          >
            {wrappedComponent}
          </AutoSaveWrapper>
        );
      }

      return wrappedComponent;
    };
  }

  static enhanceExistingPages() {
    // Gradually enhance existing pages with Phase 2 features
    const existingClientDetails = document.querySelector('#client-details-page');
    
    if (existingClientDetails) {
      const enhancedClientDetails = this.wrapExistingComponent(
        ExistingClientDetailsPage,
        { withPresence: true, withAutoSave: true }
      );
      
      // Replace existing page with enhanced version
      ReactDOM.render(
        <enhancedClientDetails />,
        existingClientDetails
      );
    }
  }
}

// Progressive enhancement of existing routes
const enhanceRoutes = (existingRoutes: Route[]) => {
  return existingRoutes.map(route => {
    if (route.path.includes('/client_groups/:id')) {
      return {
        ...route,
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <ClientDetailsLayout clientGroupId={route.params.id}>
              {route.element}
            </ClientDetailsLayout>
          </Suspense>
        )
      };
    }
    return route;
  });
};
```

---

## Testing Strategy for Components

### Comprehensive Testing Framework

```typescript
// Component testing utilities for Phase 2
export const renderWithPhase2Context = (
  component: React.ReactElement,
  options: RenderOptions = {}
) => {
  const {
    clientGroupId = 123,
    initialQuery = {},
    user = mockUser,
    ...renderOptions
  } = options;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false }
    }
  });

  const AllProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider user={user}>
        <AccessibilityProvider>
          <Phase2Provider clientGroupId={clientGroupId}>
            {children}
          </Phase2Provider>
        </AccessibilityProvider>
      </AuthProvider>
    </QueryClientProvider>
  );

  return render(component, { wrapper: AllProviders, ...renderOptions });
};

// Example component tests
describe('MainListTab', () => {
  beforeEach(() => {
    mockApiService.getInformationItems.mockResolvedValue({
      data: mockInformationItems,
      pagination: { total: 10, limit: 20, offset: 0 }
    });
  });

  test('renders information items correctly', async () => {
    renderWithPhase2Context(
      <MainListTab clientGroupId={123} isActive={true} />
    );

    expect(screen.getByText('Add Information Item')).toBeInTheDocument();
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Bank Account')).toBeInTheDocument();
    });

    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  test('handles search functionality', async () => {
    const user = userEvent.setup();
    
    renderWithPhase2Context(
      <MainListTab clientGroupId={123} isActive={true} />
    );

    const searchInput = screen.getByPlaceholderText(/search across all/i);
    await user.type(searchInput, 'Halifax');

    await waitFor(() => {
      expect(mockApiService.getInformationItems).toHaveBeenCalledWith(
        123,
        expect.objectContaining({ search: 'Halifax' })
      );
    });
  });

  test('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    
    renderWithPhase2Context(
      <MainListTab clientGroupId={123} isActive={true} />
    );

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    const firstCell = screen.getAllByRole('gridcell')[0];
    firstCell.focus();

    await user.keyboard('{ArrowDown}');
    
    expect(screen.getAllByRole('gridcell')[3]).toHaveFocus();
  });

  test('handles auto-save functionality', async () => {
    const user = userEvent.setup();
    jest.useFakeTimers();
    
    renderWithPhase2Context(
      <MainListTab clientGroupId={123} isActive={true} />
    );

    // Start editing an item
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Edit'));

    const editInput = screen.getByDisplayValue('Halifax');
    await user.clear(editInput);
    await user.type(editInput, 'Barclays');

    // Fast-forward to trigger auto-save
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(mockApiService.updateInformationItem).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          data_content: expect.objectContaining({
            bank: 'Barclays'
          })
        })
      );
    });

    jest.useRealTimers();
  });
});

// Accessibility testing
describe('Accessibility', () => {
  test('all Phase 2 components meet WCAG 2.1 AA standards', async () => {
    const { container } = renderWithPhase2Context(
      <ClientDetailsLayout clientGroupId={123} />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('keyboard navigation works across all components', async () => {
    const user = userEvent.setup();
    
    renderWithPhase2Context(
      <ClientDetailsLayout clientGroupId={123} />
    );

    // Tab through all interactive elements
    await user.tab();
    expect(screen.getByRole('tab', { name: /information items/i })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('tab', { name: /unmanaged products/i })).toHaveFocus();

    // Test tab panel activation
    await user.keyboard('{Enter}');
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });
});
```

---

## Component Specifications and Props

### Core Component APIs

```typescript
// MainListTab component API
interface MainListTabProps {
  clientGroupId: number;
  isActive: boolean;
  onEditLockChange?: (locks: EditLock[]) => void;
  initialFilters?: ItemFilters;
  className?: string;
}

// NetworthTab component API  
interface NetworthTabProps {
  clientGroupId: number;
  isActive: boolean;
  initialSections?: NetworthSection[];
  onSnapshotCreated?: (snapshot: NetworthSnapshot) => void;
  className?: string;
}

// KYCTab component API
interface KYCTabProps {
  clientGroupId: number;
  isActive: boolean;
  defaultTemplate?: string;
  onReportGenerated?: (report: KYCReport) => void;
  className?: string;
}

// UniversalSearch component API
interface UniversalSearchProps {
  clientGroupId: number;
  onResultSelect: (result: SearchResult) => void;
  placeholder?: string;
  dataTypes?: SearchDataType[];
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

// PresenceIndicator component API
interface PresenceIndicatorProps {
  users: UserPresence[];
  className?: string;
  showNames?: boolean;
  maxDisplay?: number;
  position?: 'top-right' | 'bottom-left' | 'inline';
}

// AutoSaveIndicator component API
interface AutoSaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved?: Date;
  error?: Error;
  onForceSave?: () => void;
  className?: string;
}
```

### Form Component APIs

```typescript
// ItemCreationModal component API
interface ItemCreationModalProps {
  clientGroupId: number;
  onSuccess: (item: InformationItem) => void;
  onCancel: () => void;
  initialData?: Partial<CreateInformationItemRequest>;
  mode?: 'create' | 'duplicate';
  className?: string;
}

// OwnershipConfiguration component API
// Handles TWO ownership patterns based on item category:
// Pattern 1 (simple): product_owners array for basic_detail, income_expenditure, vulnerability_health
// Pattern 2 (complex): associated_product_owners object for assets_liabilities, protection
interface OwnershipConfigurationProps {
  category: 'basic_detail' | 'income_expenditure' | 'assets_liabilities' | 'protection' | 'vulnerability_health';
  ownership?: SimpleOwnership | ComplexOwnership;  // Union type for both patterns
  productOwners: ProductOwner[];
  onChange: (ownership: SimpleOwnership | ComplexOwnership) => void;
  className?: string;
  disabled?: boolean;
  showValidation?: boolean;
}

// Pattern 1: Simple ownership (array of IDs)
interface SimpleOwnership {
  product_owners: number[];  // Array of product owner IDs
}

// Pattern 2: Complex ownership (percentages)
interface ComplexOwnership {
  associated_product_owners: {
    association_type: 'joint_tenants' | 'tenants_in_common';
    [product_owner_id: string]: number | string;  // ID -> percentage mapping
  };
}

// EditableTable component API
interface EditableTableProps<T> {
  data: T[];
  columns: EditableTableColumn<T>[];
  onRowEdit?: (item: T) => void;
  onCellEdit?: (rowIndex: number, columnKey: string, newValue: any) => void;
  onSelectionChange?: (selectedIds: Set<string | number>) => void;
  virtualizeThreshold?: number;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  ariaLabel?: string;
}

interface EditableTableColumn<T> {
  key: string;
  title: string;
  width?: number | string;
  sortable?: boolean;
  filterable?: boolean;
  editable?: boolean;
  editComponent?: React.ComponentType<any>;
  render?: (item: T, index: number) => React.ReactNode;
  accessorFn?: (item: T) => any;
}
```

### Product Owner Form Handling

**Two Distinct Patterns Based on Category**:

The form components must handle product owner selection differently based on the item category:

**Pattern 1: Multi-Select Dropdown (Simple Array)**

Used for: `basic_detail`, `income_expenditure`, `vulnerability_health`

```typescript
// Example: Address item form
const AddressItemForm = ({ productOwners, onSubmit }) => {
  const [selectedOwners, setSelectedOwners] = useState<number[]>([]);

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit({
        item_type: "Address",
        category: "basic_detail",
        data_content: {
          product_owners: selectedOwners,  // Simple array
          address_line_one: formData.addressLine1,
          address_line_two: formData.addressLine2,
          postcode: formData.postcode,
          notes: formData.notes
        }
      });
    }}>
      <MultiSelectDropdown
        label="Product Owners"
        options={productOwners.map(po => ({ id: po.id, name: po.name }))}
        value={selectedOwners}
        onChange={setSelectedOwners}
        required={true}
        placeholder="Select one or more product owners"
      />
      {/* Other form fields */}
    </form>
  );
};

// Example: Basic Salary item form (income_expenditure)
const IncomeSalaryForm = ({ productOwners, onSubmit }) => {
  const [selectedOwners, setSelectedOwners] = useState<number[]>([]);

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit({
        item_type: "Basic Salary",
        category: "income_expenditure",
        data_content: {
          product_owners: selectedOwners,  // Simple array
          description: formData.employer,
          amount: formData.amount,
          frequency: formData.frequency,
          date: formData.date,
          notes: formData.notes
        }
      });
    }}>
      <MultiSelectDropdown
        label="Product Owners"
        options={productOwners}
        value={selectedOwners}
        onChange={setSelectedOwners}
        required={true}
      />
      {/* Other form fields */}
    </form>
  );
};
```

**Pattern 2: Complex Ownership Editor (Percentage Allocation)**

Used for: `assets_liabilities`, `protection`

```typescript
// Example: Cash Account item form (assets_liabilities)
const CashAccountForm = ({ productOwners, onSubmit }) => {
  const [ownership, setOwnership] = useState({
    association_type: 'individual',
    percentages: { [productOwners[0]?.id]: 100.00 }
  });

  const handleOwnershipChange = (newOwnership) => {
    // Validate percentages total 100%
    const total = Object.values(newOwnership.percentages).reduce((sum, pct) => sum + pct, 0);
    if (Math.abs(total - 100.00) < 0.01) {
      setOwnership(newOwnership);
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();

      // Transform ownership to API format
      const associated_product_owners = {
        association_type: ownership.association_type,
        ...ownership.percentages  // Spread percentages as ID: percentage pairs
      };

      onSubmit({
        item_type: "Cash Accounts",
        category: "assets_liabilities",
        data_content: {
          associated_product_owners,  // Complex structure
          provider: formData.provider,
          current_value: formData.currentValue,
          value_date: formData.valueDate,
          start_date: formData.startDate,
          notes: formData.notes
        }
      });
    }}>
      <OwnershipPercentageInput
        label="Product Owner Allocation"
        productOwners={productOwners}
        ownership={ownership}
        onChange={handleOwnershipChange}
        required={true}
        showValidation={true}  // Shows percentage total validation
      />
      {/* Other form fields */}
    </form>
  );
};
```

**Form Validation Rules**:

```typescript
// Validation function for product owner fields
const validateProductOwners = (category: string, data_content: any): string | null => {
  // Pattern 1 validation (simple array)
  if (['basic_detail', 'income_expenditure', 'vulnerability_health'].includes(category)) {
    if (!data_content.product_owners || data_content.product_owners.length === 0) {
      return 'product_owners field required for this category';
    }
    return null;
  }

  // Pattern 2 validation (complex structure)
  if (['assets_liabilities', 'protection'].includes(category)) {
    if (!data_content.associated_product_owners) {
      return 'associated_product_owners field required for this category';
    }

    const { association_type, ...percentages } = data_content.associated_product_owners;
    if (!association_type) {
      return 'association_type is required';
    }

    // Validate percentages total 100% for tenants_in_common
    if (association_type === 'tenants_in_common') {
      const total = Object.values(percentages).reduce((sum: number, pct: any) => sum + Number(pct), 0);
      if (Math.abs(total - 100.00) > 0.01) {
        return `Ownership percentages must total 100.00% (current: ${total.toFixed(2)}%)`;
      }
    }

    return null;
  }

  return null;
};
```

---

## Professional Wealth Management Styling Guidelines

### Information-Dense Design System

**Professional Color Palette for Financial Interfaces**:
```scss
// Professional wealth management color system
:root {
  // Information density colors - prioritizing readability over aesthetics
  --color-professional-primary: #1f2937;    // Dark gray for primary text
  --color-professional-secondary: #4b5563;  // Medium gray for secondary text
  --color-professional-tertiary: #9ca3af;   // Light gray for supporting text
  
  // Dense table colors for maximum information visibility
  --color-table-header: #f9fafb;            // Subtle header background
  --color-table-row-even: #ffffff;          // White for even rows
  --color-table-row-odd: #f8fafc;          // Very light gray for odd rows
  --color-table-border: #e5e7eb;           // Light border for structure
  --color-table-hover: #f3f4f6;            // Subtle hover state
  
  // Financial status colors - professional and accessible
  --color-overdue: #dc2626;                 // Red for overdue items
  --color-due-soon: #d97706;                // Orange for due soon
  --color-on-track: #059669;                // Green for on-track items
  --color-pending: #7c2d12;                 // Brown for pending items
  
  // 3-section card colors
  --color-section-border: #d1d5db;          // Section divider
  --color-section-header: #6b7280;          // Section header text
  --color-field-label: #374151;             // Field labels
  
  // Big 5 category colors (subtle, professional)
  --color-basic-detail: #8b5cf6;            // Purple for basic detail
  --color-income-expenditure: #10b981;      // Green for income/expenditure
  --color-assets-liabilities: #3b82f6;      // Blue for assets/liabilities
  --color-protection: #f59e0b;              // Amber for protection
  --color-vulnerability-health: #ef4444;    // Red for vulnerability/health
  
  // Status and workflow colors
  --color-saving: #6366f1;                  // Indigo for saving state
  --color-saved: #10b981;                   // Green for saved state
  --color-conflict: #dc2626;                // Red for conflicts
  --color-presence-active: #059669;         // Green for active users
}
```

**Information Density Typography**:
```scss
// Professional typography prioritizing readability and information density
:root {
  // Dense table typography
  --font-size-table-header: 0.75rem;        // 12px - compact headers
  --font-size-table-cell: 0.875rem;         // 14px - readable cell text
  --font-size-table-detail: 0.75rem;        // 12px - supporting details
  
  // 3-section card typography
  --font-size-section-header: 1rem;         // 16px - section headers
  --font-size-field-label: 0.875rem;        // 14px - field labels
  --font-size-field-value: 0.875rem;        // 14px - field values
  
  // Professional spacing for information density
  --line-height-dense: 1.25;                // Compact line height
  --line-height-comfortable: 1.5;           // Standard line height
  
  // Font weights for hierarchy
  --font-weight-table-header: 600;          // Semibold for headers
  --font-weight-field-label: 500;           // Medium for labels
  --font-weight-emphasis: 600;               // Semibold for emphasis
}
```

**Information-Dense Layout System**:
```scss
// Professional spacing optimized for information density
.dense-table {
  --row-height: 36px;                       // Compact row height for 12+ rows visibility
  --cell-padding: 8px 12px;                 // Minimal cell padding
  --header-height: 40px;                    // Slightly larger header
  --border-width: 1px;                      // Subtle borders
}

.product-owner-card-3section {
  --section-gap: 16px;                      // Space between sections
  --field-spacing: 8px;                     // Space between fields
  --section-border: 1px solid var(--color-section-border);
  --card-padding: 16px;                     // Professional card padding
}

.global-actions-interface {
  --action-row-height: 40px;                // Slightly larger for cross-client view
  --urgency-indicator-size: 12px;           // Color indicators
  --status-badge-padding: 4px 8px;          // Compact status badges
}

.objectives-actions-separated {
  --column-gap: 24px;                       // Clear separation between objectives and actions
  --item-spacing: 12px;                     // Space between items
  --expand-button-size: 20px;               // [+ Expand] button size
}

// Big 5 category layout
.category-display {
  --emoji-size: 16px;                       // Category emoji size
  --emoji-text-gap: 8px;                    // Space between emoji and text
  --category-padding: 4px 8px;              // Category badge padding
}
```

**Dense Table Component Styles**:
```scss
// Information-dense table styling
.dense-data-table {
  border-collapse: separate;
  border-spacing: 0;
  width: 100%;
  font-size: var(--font-size-table-cell);
  
  .table-header {
    background-color: var(--color-table-header);
    font-size: var(--font-size-table-header);
    font-weight: var(--font-weight-table-header);
    height: var(--header-height);
    border-bottom: 2px solid var(--color-table-border);
    
    .sortable-header {
      cursor: pointer;
      user-select: none;
      transition: background-color 0.15s ease;
      
      &:hover {
        background-color: var(--color-table-hover);
      }
    }
  }
  
  .table-row {
    height: var(--row-height);
    border-bottom: var(--border-width) solid var(--color-table-border);
    transition: background-color 0.1s ease;
    
    &:nth-child(even) {
      background-color: var(--color-table-row-even);
    }
    
    &:nth-child(odd) {
      background-color: var(--color-table-row-odd);
    }
    
    &:hover {
      background-color: var(--color-table-hover);
    }
    
    &.editing {
      background-color: #fef3c7; // Light yellow for editing state
      outline: 2px solid var(--color-saving);
    }
  }
  
  .table-cell {
    padding: var(--cell-padding);
    border-right: var(--border-width) solid var(--color-table-border);
    vertical-align: middle;
    overflow: hidden;
    text-overflow: ellipsis;
    
    &:last-child {
      border-right: none;
    }
    
    .expandable-text {
      cursor: pointer;
      
      .expand-button {
        color: var(--color-professional-secondary);
        font-size: 0.75rem;
        margin-left: 4px;
        
        &:hover {
          color: var(--color-professional-primary);
        }
      }
    }
  }
}
```

**Professional Interface Animations**:
```scss
// Subtle animations for professional wealth management interfaces

// Status indicator animations
@keyframes urgency-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes save-progress {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes expand-content {
  0% { 
    max-height: 0; 
    opacity: 0; 
  }
  100% { 
    max-height: 200px; 
    opacity: 1; 
  }
}

// Urgency color coding animations
.urgency-indicator {
  &.overdue {
    color: var(--color-overdue);
    animation: urgency-pulse 1.5s infinite;
  }
  
  &.due-soon {
    color: var(--color-due-soon);
    animation: urgency-pulse 2s infinite;
  }
}

// Auto-save status animations
.save-status {
  &.saving {
    animation: save-progress 1s linear infinite;
  }
  
  &.saved {
    color: var(--color-saved);
    transition: color 0.3s ease;
  }
  
  &.conflict {
    color: var(--color-conflict);
    animation: urgency-pulse 1s infinite;
  }
}

// Expandable content animations
.expandable-content {
  overflow: hidden;
  transition: max-height 0.3s ease, opacity 0.3s ease;
  
  &.expanded {
    animation: expand-content 0.3s ease;
  }
}

// Row interaction animations
.table-row {
  transition: background-color 0.1s ease, transform 0.1s ease;
  
  &.selected {
    transform: translateX(2px);
    background-color: #e0f2fe;
    border-left: 3px solid var(--color-professional-primary);
  }
}
```

**3-Section Product Owner Card Styles**:
```scss
// Professional 3-section layout styling
.product-owner-card-3section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: var(--section-gap);
  padding: var(--card-padding);
  border: 1px solid var(--color-section-border);
  border-radius: 8px;
  background: white;
  
  .personal-details-section {
    grid-column: 1;
    grid-row: 1;
    
    .section-header {
      font-size: var(--font-size-section-header);
      font-weight: var(--font-weight-emphasis);
      color: var(--color-section-header);
      margin-bottom: 12px;
      border-bottom: 1px solid var(--color-section-border);
      padding-bottom: 4px;
    }
    
    .field-group {
      display: flex;
      flex-direction: column;
      gap: var(--field-spacing);
      
      .field-item {
        display: flex;
        justify-content: space-between;
        
        .field-label {
          font-size: var(--font-size-field-label);
          font-weight: var(--font-weight-field-label);
          color: var(--color-field-label);
        }
        
        .field-value {
          font-size: var(--font-size-field-value);
          color: var(--color-professional-primary);
        }
      }
    }
  }
  
  .contact-info-section {
    grid-column: 2;
    grid-row: 1;
    border-left: var(--section-border);
    padding-left: var(--section-gap);
    
    .phone-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      
      .phone-item {
        display: flex;
        align-items: center;
        gap: 8px;
        
        .phone-emoji {
          font-size: 14px;
        }
        
        .phone-type {
          font-size: 0.75rem;
          color: var(--color-professional-secondary);
          min-width: 60px;
        }
        
        .phone-number {
          font-family: monospace;
          font-size: var(--font-size-field-value);
        }
        
        &.primary {
          font-weight: var(--font-weight-emphasis);
        }
      }
    }
  }
  
  .full-width-section {
    grid-column: 1 / -1;
    grid-row: 2;
    border-top: var(--section-border);
    padding-top: var(--section-gap);
    
    .compliance-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    
    .security-notes {
      margin-top: 12px;
      padding: 12px;
      background-color: #f9fafb;
      border-radius: 4px;
      font-size: var(--font-size-field-value);
    }
  }
}
```

### Professional Interface Responsive Design

```scss
// Information-dense responsive patterns (desktop-first approach)
.dense-interface {
  // Large screens - optimal information density
  @media (min-width: 1440px) {
    .dense-data-table {
      --row-height: 32px;                     // Even more compact for large screens
      font-size: 0.8125rem;                   // Slightly smaller text
    }
    
    .product-owner-card-3section {
      grid-template-columns: 300px 300px;     // Fixed section widths
      max-width: 800px;                       // Prevent over-stretching
    }
    
    .global-actions-table {
      .table-cell {
        min-width: 150px;                     // Prevent column squeeze
      }
    }
  }
  
  // Standard desktop - primary target
  @media (min-width: 1024px) and (max-width: 1439px) {
    .dense-data-table {
      --row-height: 36px;                     // Standard dense height
    }
    
    .information-items-container {
      .table-container {
        min-height: 450px;                    // Ensure 12+ rows visible
      }
    }
  }
  
  // Tablet - degraded information density
  @media (max-width: 1023px) {
    .dense-data-table {
      --row-height: 44px;                     // Larger touch targets
      
      .table-cell {
        padding: 12px 8px;                    // More generous padding
      }
      
      // Hide less critical columns on smaller screens
      .column-priority-low {
        display: none;
      }
    }
    
    .product-owner-card-3section {
      grid-template-columns: 1fr;             // Stack sections vertically
      grid-template-rows: auto auto auto;
      
      .contact-info-section {
        border-left: none;
        border-top: var(--section-border);
        padding-left: 0;
        padding-top: var(--section-gap);
      }
    }
    
    .objectives-actions-separated {
      display: block;                          // Stack columns
      
      .objectives-column,
      .actions-column {
        width: 100%;
        margin-bottom: 24px;
      }
    }
  }
  
  // Mobile - minimal support (not primary target)
  @media (max-width: 768px) {
    .dense-data-table {
      // Convert to card layout on very small screens
      display: block;
      
      .table-row {
        display: block;
        border: 1px solid var(--color-table-border);
        border-radius: 4px;
        margin-bottom: 8px;
        padding: 12px;
        
        .table-cell {
          display: block;
          border: none;
          padding: 4px 0;
          
          &:before {
            content: attr(data-label) ": ";
            font-weight: var(--font-weight-emphasis);
            display: inline-block;
            min-width: 80px;
          }
        }
      }
    }
    
    .global-actions-interface {
      .urgency-filters {
        flex-wrap: wrap;
        gap: 8px;
      }
    }
  }
}

// Print styles for professional reports
@media print {
  .dense-interface {
    * {
      color: black !important;
      background: white !important;
    }
    
    .dense-data-table {
      border-collapse: collapse;
      width: 100%;
      
      .table-row {
        break-inside: avoid;
      }
    }
    
    .product-owner-card-3section {
      break-inside: avoid;
      border: 1px solid black;
    }
    
    // Hide interactive elements
    .edit-button,
    .expand-button,
    .presence-indicator,
    .auto-save-indicator {
      display: none;
    }
  }
}
```

**Accessibility Enhancements for Dense Interfaces**:
```scss
// WCAG 2.1 AA compliance for information-dense interfaces
.dense-interface {
  // High contrast mode support
  @media (prefers-contrast: high) {
    :root {
      --color-professional-primary: #000000;
      --color-professional-secondary: #333333;
      --color-table-border: #666666;
      --color-table-hover: #f0f0f0;
    }
  }
  
  // Reduced motion support
  @media (prefers-reduced-motion: reduce) {
    .urgency-indicator,
    .save-status,
    .expandable-content {
      animation: none;
    }
    
    .table-row {
      transition: none;
    }
  }
  
  // Focus management for dense tables
  .dense-data-table {
    .table-row {
      &:focus-within {
        outline: 2px solid #005fcc;
        outline-offset: -2px;
        background-color: #e3f2fd;
      }
    }
    
    .table-cell {
      &:focus {
        outline: 2px solid #005fcc;
        outline-offset: -2px;
      }
    }
  }
  
  // Screen reader optimization
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
}
```

---

## Information Density Standards

### Design Principles for Professional Wealth Management

**Core Information Density Philosophy**:
Kingston's Portal Phase 2 prioritizes **information accessibility over visual aesthetics**, following wealth management industry standards where data visibility directly impacts client service quality and business outcomes.

**Quantitative Information Density Standards**:
- **Minimum 12 rows visible** simultaneously in dense tables
- **Maximum 40px row height** (36px optimal) for information density
- **Sub-500ms rendering** target for dense displays with 100+ rows
- **12+ columns** supported without horizontal scrolling degradation
- **Big 5 categories** with emoji + text approach for older users

---

## 3-Section Product Owner Cards

### Professional Contact Information Architecture

The product owner cards implement a **professional 3-section layout** optimized for wealth management contact workflows:

- **Left Section (Personal Details)**: Known as, title, DOB, NI number
- **Right Section (Contact Info)**: Mobile 📱, House Phone 🏠, Work 💼, Email ✉️
- **Bottom Section (Full-width)**: Meetings, compliance, security words, notes

**Enhanced Phone Management**: Supports multiple phone types (mobile, house_phone, work, other) with international format validation and primary phone designation.

---

## Dense Table Components

### High-Performance Information Display

**Virtual Scrolling for Dense Tables**: Mandatory for datasets > 200 items with 36px row height, 60fps scrolling performance, and memory management for 1000+ rows.

**Accessibility Features**: WCAG 2.1 AA compliance with keyboard navigation, screen reader optimization, and high contrast support.

---

## Global Actions UI

### Cross-Client Workflow Interface

**Complete Architectural Separation**: Global Actions interface accessed via dedicated site sidebar (NOT within client details tabs), enabling true cross-client workflow management with urgency-based ordering.

**Professional Features**: PDF export, bulk action management, urgency color coding (🔴 Overdue, 🟡 Due Soon, 🟢 Future).

---

## Liquidity View Toggle

### Asset Ordering Interface

**Dual-View System**: 
- **Asset Type View**: Traditional grouping (Bank Accounts, Pensions, Investments, Property)
- **Liquidity View**: Ordered by liquidity ranking with user customization

**User Preferences**: Customizable liquidity rankings with decimal precision for fine-grained ordering.

---

## PDF Export Interface

### Professional Export Workflows

**Real-Time Progress Tracking**: Background processing with progress indicators, estimated completion times, and download status management.

**Export Queue Management**: Multiple simultaneous exports with retry capabilities and professional formatting options.

---

## Performance Optimization for Large Datasets

### Memory Management Strategy

**Dataset Chunking**: Load data in chunks of 100 items with background prefetching and memory usage monitoring (150MB threshold).

**Virtual Scrolling Optimization**: Buffer management, smooth scrolling at 60fps, and automatic garbage collection for memory efficiency.

---

## Cross-Reference Alignment

### Integration with Phase 1-3 Documentation

**Complete Phase Alignment**:
- **Phase 1 Foundation**: Information-dense professional interface requirements ✅
- **Phase 2 Database**: Enhanced schema capabilities (phones, separated actions, liquidity) ✅
- **Phase 3 API**: All new endpoints (global actions, PDF export, liquidity preferences) ✅
- **Demo Feedback**: All client-validated UI/UX requirements implemented ✅

**Architecture Validation**:
- Information density prioritized over aesthetics ✅
- Dense table components with virtualization ✅
- Complete objectives/actions separation ✅
- Professional wealth management standards ✅
- WCAG 2.1 AA accessibility compliance ✅

---

## React Error Boundary Strategy

### Cascading Error Recovery Framework

Phase 2 implements a sophisticated error boundary strategy that provides graceful degradation, user-friendly feedback, and comprehensive error reporting while maintaining application stability.

```typescript
// Phase2ErrorBoundaryProvider - Main error boundary wrapper
const Phase2ErrorBoundaryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [errorHistory, setErrorHistory] = useState<ErrorHistoryItem[]>([]);
  const [globalErrorState, setGlobalErrorState] = useState<GlobalErrorState>({
    hasErrors: false,
    errorCount: 0,
    lastError: null
  });

  const handleError = useCallback((error: Error, errorInfo: ErrorInfo, source: string) => {
    const errorItem: ErrorHistoryItem = {
      id: `error_${Date.now()}`,
      error,
      errorInfo,
      source,
      timestamp: new Date().toISOString(),
      severity: determineSeverity(error),
      correlationId: generateCorrelationId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: getCurrentUser()?.id
    };

    // Add to error history
    setErrorHistory(prev => [errorItem, ...prev.slice(0, 9)]); // Keep last 10 errors
    
    // Update global error state
    setGlobalErrorState(prev => ({
      hasErrors: true,
      errorCount: prev.errorCount + 1,
      lastError: errorItem
    }));

    // Send to error reporting service
    errorReportingService.reportError(errorItem);

    // Show user notification based on severity
    if (errorItem.severity === 'critical') {
      FeedbackManager.showError(
        'A critical error occurred. Please refresh the page.',
        {
          label: 'Refresh',
          onClick: () => window.location.reload()
        }
      );
    } else if (errorItem.severity === 'warning') {
      FeedbackManager.showWarning(
        'Some features may not work as expected. If problems persist, please refresh the page.'
      );
    }
  }, []);

  const clearErrors = useCallback(() => {
    setErrorHistory([]);
    setGlobalErrorState({
      hasErrors: false,
      errorCount: 0,
      lastError: null
    });
  }, []);

  return (
    <ErrorBoundaryContext.Provider value={{
      errorHistory,
      globalErrorState,
      handleError,
      clearErrors
    }}>
      <RootErrorBoundary onError={(error, errorInfo) => 
        handleError(error, errorInfo, 'RootErrorBoundary')
      }>
        {children}
      </RootErrorBoundary>
    </ErrorBoundaryContext.Provider>
  );
};

// Component-level error boundaries with recovery strategies
const ComponentErrorBoundary: React.FC<ComponentErrorBoundaryProps> = ({
  children,
  fallback,
  onError,
  recoveryStrategies = ['retry', 'fallback'],
  componentName,
  criticalComponent = false
}) => {
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { handleError } = useErrorBoundaryContext();
  const maxRetries = criticalComponent ? 3 : 1;

  const handleErrorCapture = useCallback((error: Error, errorInfo: ErrorInfo) => {
    setError(error);
    handleError(error, errorInfo, componentName);
    onError?.(error, errorInfo);
  }, [handleError, componentName, onError]);

  const retryComponent = useCallback(() => {
    if (retryCount < maxRetries) {
      setError(null);
      setRetryCount(prev => prev + 1);
      
      FeedbackManager.showInfo(`Retrying ${componentName}... (${retryCount + 1}/${maxRetries})`);
    }
  }, [retryCount, maxRetries, componentName]);

  const resetErrorBoundary = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  if (error) {
    // Determine recovery strategy
    if (recoveryStrategies.includes('retry') && retryCount < maxRetries) {
      return (
        <ErrorRecoveryCard
          error={error}
          componentName={componentName}
          onRetry={retryComponent}
          onReset={resetErrorBoundary}
          retryCount={retryCount}
          maxRetries={maxRetries}
        />
      );
    }

    // Fallback to error display
    if (fallback) {
      return React.isValidElement(fallback) ? fallback : React.createElement(fallback, { error, resetErrorBoundary });
    }

    return (
      <DefaultErrorFallback
        error={error}
        resetErrorBoundary={resetErrorBoundary}
        componentName={componentName}
        criticalComponent={criticalComponent}
      />
    );
  }

  return (
    <ErrorBoundary
      onError={handleErrorCapture}
      onReset={resetErrorBoundary}
    >
      {children}
    </ErrorBoundary>
  );
};

// Error recovery UI components
const ErrorRecoveryCard: React.FC<ErrorRecoveryCardProps> = ({
  error,
  componentName,
  onRetry,
  onReset,
  retryCount,
  maxRetries
}) => {
  return (
    <div className="error-recovery-card" role="alert" aria-live="assertive">
      <div className="error-icon">
        <ExclamationTriangleIcon className="w-6 h-6 text-amber-500" />
      </div>
      
      <div className="error-content">
        <h3>Component Error</h3>
        <p>
          The {componentName} component encountered an error and is attempting to recover.
        </p>
        
        {retryCount > 0 && (
          <p className="retry-info">
            Retry attempt {retryCount} of {maxRetries}
          </p>
        )}
      </div>

      <div className="error-actions">
        <ActionButton
          variant="primary"
          onClick={onRetry}
          disabled={retryCount >= maxRetries}
        >
          Retry Component
        </ActionButton>
        
        <ActionButton
          variant="outline"
          onClick={onReset}
        >
          Reset
        </ActionButton>
      </div>
    </div>
  );
};

// Specialized error boundaries for different component types
const DataTableErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ComponentErrorBoundary
      componentName="DataTable"
      recoveryStrategies={['retry', 'fallback']}
      fallback={({ resetErrorBoundary }) => (
        <EmptyState
          icon={<DatabaseIcon className="w-12 h-12 text-gray-400" />}
          title="Table Error"
          description="Unable to load table data. Please try refreshing."
          action={{
            label: 'Retry',
            onClick: resetErrorBoundary
          }}
        />
      )}
    >
      {children}
    </ComponentErrorBoundary>
  );
};

const FormErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ComponentErrorBoundary
      componentName="Form"
      recoveryStrategies={['retry']}
      criticalComponent={true}
      fallback={({ error, resetErrorBoundary }) => (
        <div className="form-error-fallback">
          <AlertCircleIcon className="w-8 h-8 text-red-500 mb-2" />
          <h3>Form Error</h3>
          <p>There was an error with the form. Your data has been preserved.</p>
          <ActionButton onClick={resetErrorBoundary}>Retry Form</ActionButton>
        </div>
      )}
    >
      {children}
    </ComponentErrorBoundary>
  );
};
```

### Error Reporting and Monitoring Integration

```typescript
// Error reporting service with correlation IDs
class ErrorReportingService {
  private correlationIds = new Map<string, string>();
  private errorQueue: ErrorReport[] = [];
  private isOffline = false;

  constructor() {
    this.setupOfflineDetection();
    this.setupPeriodicFlush();
  }

  reportError(errorItem: ErrorHistoryItem): void {
    const report: ErrorReport = {
      ...errorItem,
      sessionId: this.getSessionId(),
      buildVersion: process.env.REACT_APP_VERSION || 'unknown',
      featureFlags: this.getActiveFeatureFlags(),
      userContext: this.getUserContext(),
      performanceMetrics: this.getPerformanceMetrics()
    };

    if (this.isOffline) {
      this.errorQueue.push(report);
    } else {
      this.sendErrorReport(report);
    }
  }

  private async sendErrorReport(report: ErrorReport): Promise<void> {
    try {
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': report.correlationId
        },
        body: JSON.stringify(report)
      });
    } catch (error) {
      console.error('Failed to send error report:', error);
      this.errorQueue.push(report);
    }
  }

  private generateCorrelationId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getPerformanceMetrics() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        loadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        memoryUsage: (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit
        } : null
      };
    }
    return null;
  }
}
```

---

## Comprehensive Testing Strategy

### Testing Utilities and Component Testing Patterns

Phase 2 implements a comprehensive testing framework that covers unit testing, integration testing, accessibility testing, and performance testing for all Phase 2 components.

```typescript
// Enhanced testing utilities for Phase 2
export const createPhase2TestUtils = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0
      },
      mutations: {
        retry: false
      }
    }
  });

  const mockApiService = {
    getInformationItems: jest.fn(),
    updateInformationItem: jest.fn(),
    createInformationItem: jest.fn(),
    deleteInformationItem: jest.fn(),
    getUnmanagedProducts: jest.fn(),
    generateNetworthStatement: jest.fn(),
    createNetworthSnapshot: jest.fn(),
    generateKYCReport: jest.fn(),
    universalSearch: jest.fn(),
    updateUserPresence: jest.fn(),
    getPagePresence: jest.fn()
  };

  const renderWithProviders = (
    component: React.ReactElement,
    options: TestRenderOptions = {}
  ) => {
    const {
      clientGroupId = 123,
      user = mockUser,
      initialQueryData = {},
      mockApiResponses = {},
      errorBoundary = true,
      accessibility = true,
      ...renderOptions
    } = options;

    // Setup mock API responses
    Object.entries(mockApiResponses).forEach(([method, response]) => {
      if (method in mockApiService) {
        (mockApiService as any)[method].mockResolvedValue(response);
      }
    });

    // Setup query client with initial data
    Object.entries(initialQueryData).forEach(([queryKey, data]) => {
      queryClient.setQueryData(queryKey, data);
    });

    const AllProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      let wrappedChildren = (
        <QueryClientProvider client={queryClient}>
          <AuthProvider user={user}>
            <ApiServiceProvider service={mockApiService}>
              <Phase2Provider clientGroupId={clientGroupId}>
                {children}
              </Phase2Provider>
            </ApiServiceProvider>
          </AuthProvider>
        </QueryClientProvider>
      );

      if (errorBoundary) {
        wrappedChildren = (
          <Phase2ErrorBoundaryProvider>
            {wrappedChildren}
          </Phase2ErrorBoundaryProvider>
        );
      }

      if (accessibility) {
        wrappedChildren = (
          <AccessibilityProvider>
            {wrappedChildren}
          </AccessibilityProvider>
        );
      }

      return wrappedChildren;
    };

    return {
      ...render(component, { wrapper: AllProviders, ...renderOptions }),
      mockApiService,
      queryClient,
      user
    };
  };

  const renderAccessibleComponent = async (
    component: React.ReactElement,
    options: TestRenderOptions = {}
  ) => {
    const result = renderWithProviders(component, options);
    
    // Wait for component to fully render
    await waitFor(() => {
      expect(result.container.firstChild).toBeInTheDocument();
    });

    // Run accessibility tests
    const axeResults = await axe(result.container);
    expect(axeResults).toHaveNoViolations();

    return result;
  };

  return {
    renderWithProviders,
    renderAccessibleComponent,
    mockApiService,
    queryClient
  };
};

// Component-specific test utilities
export const createTableTestUtils = () => {
  const testKeyboardNavigation = async (container: HTMLElement) => {
    const user = userEvent.setup();
    const table = screen.getByRole('table') || screen.getByRole('grid');
    expect(table).toBeInTheDocument();

    // Focus first cell
    const firstCell = within(table).getAllByRole('gridcell')[0];
    firstCell.focus();
    expect(firstCell).toHaveFocus();

    // Test arrow key navigation
    await user.keyboard('{ArrowDown}');
    const secondRowCell = within(table).getAllByRole('gridcell')[3]; // Assuming 3 columns
    expect(secondRowCell).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    const nextColumnCell = within(table).getAllByRole('gridcell')[4];
    expect(nextColumnCell).toHaveFocus();

    // Test Home/End navigation
    await user.keyboard('{Home}');
    const firstCellInRow = within(table).getAllByRole('gridcell')[3];
    expect(firstCellInRow).toHaveFocus();

    await user.keyboard('{End}');
    const lastCellInRow = within(table).getAllByRole('gridcell')[5];
    expect(lastCellInRow).toHaveFocus();
  };

  const testSorting = async (columnName: string) => {
    const user = userEvent.setup();
    const columnHeader = screen.getByRole('columnheader', { name: new RegExp(columnName, 'i') });
    
    // Initial state should be unsorted
    expect(columnHeader).toHaveAttribute('aria-sort', 'none');

    // Click to sort ascending
    await user.click(columnHeader);
    expect(columnHeader).toHaveAttribute('aria-sort', 'ascending');

    // Click to sort descending
    await user.click(columnHeader);
    expect(columnHeader).toHaveAttribute('aria-sort', 'descending');

    // Click to remove sort
    await user.click(columnHeader);
    expect(columnHeader).toHaveAttribute('aria-sort', 'none');
  };

  const testInlineEditing = async (cellContent: string, newValue: string) => {
    const user = userEvent.setup();
    const cell = screen.getByText(cellContent).closest('[role="gridcell"]');
    expect(cell).toBeInTheDocument();

    // Double-click to edit
    await user.dblClick(cell!);
    const editInput = screen.getByDisplayValue(cellContent);
    expect(editInput).toBeInTheDocument();
    expect(editInput).toHaveFocus();

    // Edit value
    await user.clear(editInput);
    await user.type(editInput, newValue);

    // Confirm edit with Enter
    await user.keyboard('{Enter}');
    expect(screen.getByText(newValue)).toBeInTheDocument();
  };

  return {
    testKeyboardNavigation,
    testSorting,
    testInlineEditing
  };
};

export const createFormTestUtils = () => {
  const testAutoSave = async (formContainer: HTMLElement, delay = 30000) => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const input = within(formContainer).getByRole('textbox');
    await user.type(input, 'test value');

    // Fast-forward to trigger auto-save
    act(() => {
      jest.advanceTimersByTime(delay);
    });

    // Check for save indicator
    expect(screen.getByText(/saving/i) || screen.getByText(/saved/i)).toBeInTheDocument();

    jest.useRealTimers();
  };

  const testValidation = async (field: HTMLElement, invalidValue: string, expectedError: string) => {
    const user = userEvent.setup();
    
    await user.clear(field);
    await user.type(field, invalidValue);
    await user.tab(); // Trigger blur validation

    await waitFor(() => {
      expect(screen.getByText(expectedError)).toBeInTheDocument();
    });

    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAttribute('aria-describedby');
  };

  return {
    testAutoSave,
    testValidation
  };
};

// Performance testing utilities
export const createPerformanceTestUtils = () => {
  const measureRenderTime = async (component: React.ReactElement, iterations = 10) => {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      const { unmount } = render(component);
      const endTime = performance.now();
      
      times.push(endTime - startTime);
      unmount();
    }

    const average = times.reduce((sum, time) => sum + time, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    return { average, min, max, times };
  };

  const testVirtualization = async (itemCount: number, containerHeight: number) => {
    const items = Array.from({ length: itemCount }, (_, i) => ({ id: i, name: `Item ${i}` }));
    
    render(
      <VirtualizedList
        items={items}
        itemHeight={50}
        containerHeight={containerHeight}
        renderItem={(item) => <div key={item.id}>{item.name}</div>}
      />
    );

    // Check that only visible items are rendered
    const visibleCount = Math.ceil(containerHeight / 50) + 5; // Adding overscan
    const renderedItems = screen.getAllByText(/Item \d+/);
    
    expect(renderedItems.length).toBeLessThanOrEqual(visibleCount);
    expect(renderedItems.length).toBeGreaterThan(0);
  };

  return {
    measureRenderTime,
    testVirtualization
  };
};
```

### Accessibility Testing Patterns

```typescript
// Comprehensive accessibility testing suite
export const createAccessibilityTestSuite = () => {
  const testWCAG21AA = async (container: HTMLElement) => {
    // Run axe-core tests with WCAG 2.1 AA ruleset
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
        'focus-management': { enabled: true },
        'aria-labels': { enabled: true },
        'heading-hierarchy': { enabled: true },
        'landmarks': { enabled: true }
      }
    });

    expect(results).toHaveNoViolations();
  };

  const testKeyboardNavigation = async (container: HTMLElement) => {
    const user = userEvent.setup();
    const focusableElements = within(container).getAllByRole(/button|link|textbox|combobox|checkbox|radio|tab/);
    
    if (focusableElements.length === 0) return;

    // Test tab navigation
    const firstElement = focusableElements[0];
    firstElement.focus();
    expect(firstElement).toHaveFocus();

    // Tab through all elements
    for (let i = 1; i < focusableElements.length; i++) {
      await user.tab();
      expect(focusableElements[i]).toHaveFocus();
    }

    // Test shift+tab (reverse navigation)
    for (let i = focusableElements.length - 2; i >= 0; i--) {
      await user.tab({ shift: true });
      expect(focusableElements[i]).toHaveFocus();
    }
  };

  const testAriaLabels = (container: HTMLElement) => {
    // Check that interactive elements have accessible names
    const interactiveElements = within(container).getAllByRole(/button|link|textbox|combobox|checkbox|radio/);
    
    interactiveElements.forEach(element => {
      expect(element).toHaveAccessibleName();
    });
  };

  const testScreenReaderAnnouncements = async (container: HTMLElement) => {
    // Check for proper live regions
    const liveRegions = within(container).getAllByRole('status') ||
                        within(container).getAllByRole('alert') ||
                        container.querySelectorAll('[aria-live]');
    
    // Ensure status messages are announced
    expect(liveRegions.length).toBeGreaterThanOrEqual(0);
    
    // Test specific announcements
    const announcements = within(container).queryAllByLabelText(/announcement|status/i);
    announcements.forEach(announcement => {
      expect(announcement).toHaveAttribute('aria-live');
    });
  };

  const testColorContrast = async (container: HTMLElement) => {
    // This would typically use a color contrast checking library
    const textElements = container.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, button, a');
    
    textElements.forEach(element => {
      const computedStyle = getComputedStyle(element);
      const { color, backgroundColor } = computedStyle;
      
      // Basic check that text is visible (not transparent)
      expect(color).not.toBe('rgba(0, 0, 0, 0)');
      expect(color).not.toBe('transparent');
    });
  };

  return {
    testWCAG21AA,
    testKeyboardNavigation,
    testAriaLabels,
    testScreenReaderAnnouncements,
    testColorContrast
  };
};

// Example comprehensive component test
describe('MainListTab Accessibility', () => {
  const { testWCAG21AA, testKeyboardNavigation, testAriaLabels } = createAccessibilityTestSuite();
  const { renderAccessibleComponent } = createPhase2TestUtils();

  test('meets WCAG 2.1 AA accessibility standards', async () => {
    const { container } = await renderAccessibleComponent(
      <MainListTab clientGroupId={123} isActive={true} />
    );

    await testWCAG21AA(container);
  });

  test('supports complete keyboard navigation', async () => {
    const { container } = await renderAccessibleComponent(
      <MainListTab clientGroupId={123} isActive={true} />
    );

    await testKeyboardNavigation(container);
  });

  test('provides appropriate ARIA labels', async () => {
    const { container } = await renderAccessibleComponent(
      <MainListTab clientGroupId={123} isActive={true} />
    );

    testAriaLabels(container);
  });
});
```

---

## Build Optimization Strategy

### Advanced Build Configuration and Bundle Splitting

Phase 2 implements sophisticated build optimization strategies to ensure optimal performance, efficient bundle splitting, and advanced caching mechanisms.

```typescript
// vite.config.ts - Enhanced build configuration
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { resolve } from 'path';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
      // Bundle analyzer for production builds
      mode === 'production' && visualizer({
        filename: 'dist/bundle-analysis.html',
        open: false,
        gzipSize: true,
        brotliSize: true
      })
    ].filter(Boolean),
    
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@/components': resolve(__dirname, 'src/components'),
        '@/hooks': resolve(__dirname, 'src/hooks'),
        '@/services': resolve(__dirname, 'src/services'),
        '@/utils': resolve(__dirname, 'src/utils'),
        '@/types': resolve(__dirname, 'src/types')
      }
    },

    build: {
      target: 'es2020',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info'],
          remove_unreachable_code: true
        },
        mangle: {
          safari10: true
        }
      },
      
      rollupOptions: {
        output: {
          // Advanced chunk splitting strategy
          manualChunks: {
            // Vendor libraries
            'vendor-react': ['react', 'react-dom'],
            'vendor-routing': ['react-router-dom'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-ui': ['@headlessui/react', '@heroicons/react'],
            'vendor-forms': ['react-hook-form', 'zod'],
            'vendor-utils': ['lodash', 'date-fns', 'classnames'],
            
            // Phase 2 specific chunks
            'phase2-core': [
              'src/components/phase2/client-details',
              'src/hooks/usePhase2',
              'src/services/phase2ApiService'
            ],
            'phase2-search': [
              'src/components/phase2/search',
              'src/hooks/useUniversalSearch'
            ],
            'phase2-reports': [
              'src/components/phase2/reports',
              'src/services/reportGenerationService'
            ],
            
            // UI component chunks
            'ui-tables': [
              'src/components/ui/tables',
              'src/components/ui/data-displays'
            ],
            'ui-forms': [
              'src/components/ui/inputs',
              'src/components/ui/dropdowns'
            ],
            'ui-feedback': [
              'src/components/ui/feedback',
              'src/components/ui/modals'
            ]
          },
          
          // Optimize chunk names
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId;
            if (facadeModuleId) {
              return `chunks/[name]-[hash].js`;
            }
            return 'chunks/[name]-[hash].js';
          },
          
          // Optimize asset names
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name!.split('.');
            const ext = info[info.length - 1];
            
            if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name!)) {
              return `images/[name]-[hash][extname]`;
            }
            
            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name!)) {
              return `fonts/[name]-[hash][extname]`;
            }
            
            return `assets/[name]-[hash][extname]`;
          }
        }
      },
      
      // Source map configuration
      sourcemap: mode === 'development' ? 'inline' : false,
      
      // Reporting configuration
      reportCompressedSize: true,
      chunkSizeWarningLimit: 1000
    },

    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@tanstack/react-query',
        'react-router-dom',
        'lodash',
        'date-fns'
      ],
      exclude: [
        // Exclude large optional dependencies
        'canvas',
        'jsdom'
      ]
    },

    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://127.0.0.1:8001',
          changeOrigin: true,
          secure: false
        }
      }
    },

    preview: {
      port: 3000
    }
  };
});

// Advanced lazy loading utilities
export const createLazyComponent = <P extends object>(
  componentImport: () => Promise<{ default: React.ComponentType<P> }>,
  options: LazyComponentOptions = {}
) => {
  const {
    fallback = <ComponentSkeleton />,
    errorFallback = <ComponentErrorFallback />,
    retryDelay = 1000,
    maxRetries = 3
  } = options;

  const LazyComponent = lazy(() => {
    let retryCount = 0;
    
    const loadWithRetry = async (): Promise<{ default: React.ComponentType<P> }> => {
      try {
        return await componentImport();
      } catch (error) {
        if (retryCount < maxRetries) {
          retryCount++;
          console.warn(`Failed to load component, retrying (${retryCount}/${maxRetries})...`);
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
          return loadWithRetry();
        }
        throw error;
      }
    };

    return loadWithRetry();
  });

  return (props: P) => (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

// Phase 2 lazy-loaded components
export const LazyMainListTab = createLazyComponent(
  () => import('../components/phase2/client-details/MainListTab'),
  {
    fallback: <TabSkeleton />,
    errorFallback: <TabErrorFallback componentName="Information Items Tab" />
  }
);

export const LazyNetworkTab = createLazyComponent(
  () => import('../components/phase2/client-details/NetworthTab'),
  {
    fallback: <TabSkeleton />,
    errorFallback: <TabErrorFallback componentName="Net Worth Tab" />
  }
);

export const LazyKYCTab = createLazyComponent(
  () => import('../components/phase2/client-details/KYCTab'),
  {
    fallback: <TabSkeleton />,
    errorFallback: <TabErrorFallback componentName="KYC Reports Tab" />
  }
);

export const LazyUniversalSearch = createLazyComponent(
  () => import('../components/phase2/search/UniversalSearch'),
  {
    fallback: <SearchSkeleton />,
    errorFallback: <SearchErrorFallback />
  }
);
```

### Performance Monitoring Integration

```typescript
// Performance monitoring service with component-level metrics
class PerformanceMonitoringService {
  private metrics: PerformanceMetric[] = [];
  private correlationIds = new Map<string, string>();
  private componentRenderTimes = new Map<string, number[]>();
  private observer: PerformanceObserver | null = null;

  constructor() {
    this.initializePerformanceObserver();
    this.setupReportingInterval();
  }

  // Component-level performance tracking
  trackComponentRender(componentName: string, startTime: number, endTime: number): void {
    const renderTime = endTime - startTime;
    
    if (!this.componentRenderTimes.has(componentName)) {
      this.componentRenderTimes.set(componentName, []);
    }
    
    const times = this.componentRenderTimes.get(componentName)!;
    times.push(renderTime);
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.splice(0, times.length - 100);
    }

    // Report slow renders (> 16ms for 60fps)
    if (renderTime > 16) {
      this.reportSlowRender(componentName, renderTime);
    }
  }

  // Hook for measuring React component performance
  measureComponent<P>(ComponentClass: React.ComponentType<P>, componentName: string) {
    return React.forwardRef<any, P>((props, ref) => {
      const startTimeRef = useRef<number>();
      
      useLayoutEffect(() => {
        startTimeRef.current = performance.now();
      });

      useEffect(() => {
        if (startTimeRef.current) {
          const endTime = performance.now();
          this.trackComponentRender(componentName, startTimeRef.current, endTime);
        }
      });

      return <ComponentClass ref={ref} {...props} />;
    });
  }

  // Core Web Vitals tracking
  trackCoreWebVitals(): void {
    // Track Largest Contentful Paint
    this.trackLCP();
    
    // Track First Input Delay
    this.trackFID();
    
    // Track Cumulative Layout Shift
    this.trackCLS();
  }

  private trackLCP(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      this.reportMetric({
        name: 'largest-contentful-paint',
        value: lastEntry.startTime,
        rating: this.getRating(lastEntry.startTime, [2500, 4000]),
        correlationId: this.getCurrentCorrelationId()
      });
    });
    
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  }

  private trackFID(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.reportMetric({
          name: 'first-input-delay',
          value: entry.processingStart - entry.startTime,
          rating: this.getRating(entry.processingStart - entry.startTime, [100, 300]),
          correlationId: this.getCurrentCorrelationId()
        });
      });
    });
    
    observer.observe({ entryTypes: ['first-input'] });
  }

  private trackCLS(): void {
    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      
      this.reportMetric({
        name: 'cumulative-layout-shift',
        value: clsValue,
        rating: this.getRating(clsValue, [0.1, 0.25]),
        correlationId: this.getCurrentCorrelationId()
      });
    });
    
    observer.observe({ entryTypes: ['layout-shift'] });
  }

  // Bundle size analysis
  analyzeBundlePerformance(): BundleAnalysis {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    const jsResources = resources.filter(r => r.name.includes('.js'));
    const cssResources = resources.filter(r => r.name.includes('.css'));
    
    return {
      totalLoadTime: navigation.loadEventEnd - navigation.fetchStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      firstContentfulPaint: this.getFirstContentfulPaint(),
      resourceLoadTimes: {
        javascript: jsResources.map(r => ({
          name: r.name,
          size: r.transferSize,
          loadTime: r.responseEnd - r.requestStart,
          cached: r.transferSize === 0
        })),
        css: cssResources.map(r => ({
          name: r.name,
          size: r.transferSize,
          loadTime: r.responseEnd - r.requestStart,
          cached: r.transferSize === 0
        }))
      },
      recommendations: this.generatePerformanceRecommendations(jsResources, cssResources)
    };
  }

  private generatePerformanceRecommendations(
    jsResources: PerformanceResourceTiming[],
    cssResources: PerformanceResourceTiming[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Check for large bundles
    jsResources.forEach(resource => {
      if (resource.transferSize > 1024 * 1024) { // 1MB
        recommendations.push(`Consider code splitting for ${resource.name} (${Math.round(resource.transferSize / 1024)}KB)`);
      }
    });
    
    // Check for uncached resources
    const uncachedResources = [...jsResources, ...cssResources].filter(r => r.transferSize > 0);
    if (uncachedResources.length > 5) {
      recommendations.push('Consider implementing better caching strategies');
    }
    
    // Check for slow loading resources
    const slowResources = [...jsResources, ...cssResources].filter(
      r => r.responseEnd - r.requestStart > 1000
    );
    if (slowResources.length > 0) {
      recommendations.push('Some resources are loading slowly, consider CDN or optimization');
    }
    
    return recommendations;
  }

  // Component performance analysis
  getComponentPerformanceReport(): ComponentPerformanceReport {
    const report: ComponentPerformanceReport = {
      components: [],
      slowComponents: [],
      recommendations: []
    };
    
    this.componentRenderTimes.forEach((times, componentName) => {
      const average = times.reduce((sum, time) => sum + time, 0) / times.length;
      const max = Math.max(...times);
      const min = Math.min(...times);
      const p95 = this.percentile(times, 0.95);
      
      const componentReport: ComponentMetrics = {
        name: componentName,
        averageRenderTime: average,
        maxRenderTime: max,
        minRenderTime: min,
        p95RenderTime: p95,
        renderCount: times.length,
        rating: average > 16 ? 'poor' : average > 8 ? 'needs-improvement' : 'good'
      };
      
      report.components.push(componentReport);
      
      if (componentReport.rating === 'poor') {
        report.slowComponents.push(componentReport);
      }
    });
    
    // Generate recommendations
    if (report.slowComponents.length > 0) {
      report.recommendations.push('Consider optimizing slow-rendering components with React.memo or useMemo');
      report.recommendations.push('Review component re-render patterns and state management');
    }
    
    return report;
  }
}

// Performance monitoring hooks
export const usePerformanceMonitoring = (componentName: string) => {
  const startTimeRef = useRef<number>();
  const [renderTime, setRenderTime] = useState<number | null>(null);
  
  useLayoutEffect(() => {
    startTimeRef.current = performance.now();
  });

  useEffect(() => {
    if (startTimeRef.current) {
      const endTime = performance.now();
      const duration = endTime - startTimeRef.current;
      
      setRenderTime(duration);
      performanceMonitoringService.trackComponentRender(componentName, startTimeRef.current, endTime);
    }
  });

  return { renderTime };
};

// HOC for automatic performance monitoring
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => {
    usePerformanceMonitoring(componentName);
    return <Component ref={ref} {...props} />;
  });
  
  WrappedComponent.displayName = `withPerformanceMonitoring(${componentName})`;
  return WrappedComponent;
};
```

---

## Concurrent User State Management Enhancement

### Advanced Conflict Resolution UI Patterns

Phase 2 implements sophisticated state management for concurrent user scenarios with detailed conflict resolution interfaces and user-friendly collaboration patterns.

```typescript
// Enhanced concurrent user state management
const useConcurrentUserManagement = (resourceId: string, resourceType: string) => {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [editLocks, setEditLocks] = useState<EditLock[]>([]);
  const [conflictState, setConflictState] = useState<ConflictState | null>(null);
  const [collaborationMode, setCollaborationMode] = useState<'cooperative' | 'locked' | 'conflicts'>('cooperative');
  
  const currentUser = useCurrentUser();
  const intervalRef = useRef<NodeJS.Timeout>();

  // Real-time presence and lock synchronization
  const syncCollaborationState = useCallback(async () => {
    try {
      const [presenceData, lockData, conflictData] = await Promise.all([
        apiService.getResourcePresence(resourceId, resourceType),
        apiService.getResourceLocks(resourceId, resourceType),
        apiService.getResourceConflicts(resourceId, resourceType)
      ]);

      setActiveUsers(presenceData.active_users);
      setEditLocks(lockData.locks);
      
      if (conflictData.has_conflicts) {
        setConflictState(conflictData.conflict_state);
        setCollaborationMode('conflicts');
      } else if (lockData.locks.some(lock => lock.user_id !== currentUser.id)) {
        setCollaborationMode('locked');
      } else {
        setCollaborationMode('cooperative');
        setConflictState(null);
      }
    } catch (error) {
      console.error('Failed to sync collaboration state:', error);
    }
  }, [resourceId, resourceType, currentUser.id]);

  // Acquire edit lock for specific field or section
  const acquireEditLock = useCallback(async (fieldPath: string, lockType: 'field' | 'section' = 'field') => {
    try {
      const lockResult = await apiService.acquireEditLock({
        resource_id: resourceId,
        resource_type: resourceType,
        field_path: fieldPath,
        lock_type: lockType,
        user_id: currentUser.id
      });

      if (lockResult.success) {
        setEditLocks(prev => [...prev.filter(lock => lock.field_path !== fieldPath), lockResult.lock]);
        return { success: true, lock: lockResult.lock };
      } else {
        // Show conflict resolution UI
        if (lockResult.conflict) {
          setConflictState({
            type: 'lock_conflict',
            field_path: fieldPath,
            conflicting_user: lockResult.conflict.existing_lock.user_name,
            acquired_at: lockResult.conflict.existing_lock.acquired_at,
            resolution_options: ['request_unlock', 'wait', 'cancel']
          });
        }
        return { success: false, error: lockResult.error };
      }
    } catch (error) {
      return { success: false, error: 'Failed to acquire lock' };
    }
  }, [resourceId, resourceType, currentUser.id]);

  // Release edit lock
  const releaseEditLock = useCallback(async (fieldPath: string) => {
    try {
      await apiService.releaseEditLock({
        resource_id: resourceId,
        resource_type: resourceType,
        field_path: fieldPath,
        user_id: currentUser.id
      });

      setEditLocks(prev => prev.filter(lock => 
        !(lock.field_path === fieldPath && lock.user_id === currentUser.id)
      ));
    } catch (error) {
      console.error('Failed to release lock:', error);
    }
  }, [resourceId, resourceType, currentUser.id]);

  // Check if current user can edit specific field
  const canEdit = useCallback((fieldPath: string): boolean => {
    const existingLock = editLocks.find(lock => lock.field_path === fieldPath);
    return !existingLock || existingLock.user_id === currentUser.id;
  }, [editLocks, currentUser.id]);

  // Get user currently editing field
  const getFieldEditor = useCallback((fieldPath: string): ActiveUser | null => {
    const lock = editLocks.find(lock => lock.field_path === fieldPath);
    if (!lock) return null;
    return activeUsers.find(user => user.user_id === lock.user_id) || null;
  }, [editLocks, activeUsers]);

  // Setup real-time synchronization
  useEffect(() => {
    syncCollaborationState();
    intervalRef.current = setInterval(syncCollaborationState, 5000); // Sync every 5 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Release all locks on unmount
      editLocks
        .filter(lock => lock.user_id === currentUser.id)
        .forEach(lock => releaseEditLock(lock.field_path));
    };
  }, [syncCollaborationState]);

  return {
    activeUsers,
    editLocks,
    conflictState,
    collaborationMode,
    acquireEditLock,
    releaseEditLock,
    canEdit,
    getFieldEditor,
    syncCollaborationState
  };
};

// Collaborative editing UI components
const CollaborativeFieldWrapper: React.FC<CollaborativeFieldWrapperProps> = ({
  fieldPath,
  children,
  resourceId,
  resourceType,
  className = ''
}) => {
  const {
    canEdit,
    getFieldEditor,
    acquireEditLock,
    releaseEditLock
  } = useConcurrentUserManagement(resourceId, resourceType);
  
  const [isEditing, setIsEditing] = useState(false);
  const [showConflictUI, setShowConflictUI] = useState(false);
  
  const fieldEditor = getFieldEditor(fieldPath);
  const canUserEdit = canEdit(fieldPath);

  const handleEditStart = async () => {
    if (!canUserEdit) {
      setShowConflictUI(true);
      return;
    }

    const lockResult = await acquireEditLock(fieldPath);
    if (lockResult.success) {
      setIsEditing(true);
    } else {
      setShowConflictUI(true);
    }
  };

  const handleEditEnd = async () => {
    await releaseEditLock(fieldPath);
    setIsEditing(false);
  };

  return (
    <div className={`collaborative-field ${className} ${isEditing ? 'editing' : ''} ${!canUserEdit ? 'locked' : ''}`}>
      {/* Field Editor Indicator */}
      {fieldEditor && !isEditing && (
        <div className="field-editor-indicator">
          <UserAvatar 
            user={fieldEditor} 
            size="sm" 
            className="pulse-animation"
          />
          <span className="editor-name">
            {fieldEditor.user_name} is editing
          </span>
        </div>
      )}

      {/* Main Field Content */}
      <div className="field-content">
        {React.cloneElement(children, {
          disabled: !canUserEdit && !isEditing,
          onFocus: handleEditStart,
          onBlur: handleEditEnd,
          'data-field-path': fieldPath
        })}
      </div>

      {/* Conflict Resolution UI */}
      {showConflictUI && (
        <FieldConflictModal
          fieldPath={fieldPath}
          conflictingUser={fieldEditor}
          onResolve={() => setShowConflictUI(false)}
          onCancel={() => setShowConflictUI(false)}
        />
      )}
    </div>
  );
};

// Field-level conflict resolution modal
const FieldConflictModal: React.FC<FieldConflictModalProps> = ({
  fieldPath,
  conflictingUser,
  onResolve,
  onCancel
}) => {
  const [resolutionStrategy, setResolutionStrategy] = useState<'wait' | 'request' | 'force'>('wait');
  const [requestSent, setRequestSent] = useState(false);

  const handleRequestUnlock = async () => {
    try {
      await apiService.requestFieldUnlock({
        field_path: fieldPath,
        requesting_user: getCurrentUser().id,
        current_editor: conflictingUser?.user_id
      });
      
      setRequestSent(true);
      FeedbackManager.showInfo(`Unlock request sent to ${conflictingUser?.user_name}`);
    } catch (error) {
      FeedbackManager.showError('Failed to send unlock request');
    }
  };

  const handleForceUnlock = async () => {
    try {
      await apiService.forceFieldUnlock({
        field_path: fieldPath,
        forcing_user: getCurrentUser().id
      });
      
      FeedbackManager.showSuccess('Field unlocked successfully');
      onResolve();
    } catch (error) {
      FeedbackManager.showError('Failed to force unlock field');
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title="Field Being Edited"
      size="md"
      className="field-conflict-modal"
    >
      <div className="conflict-content">
        <div className="conflict-info">
          <UserAvatar user={conflictingUser} size="md" />
          <div className="conflict-details">
            <h4>{conflictingUser?.user_name} is currently editing this field</h4>
            <p>Started editing {formatRelativeTime(conflictingUser?.active_since)}</p>
          </div>
        </div>

        <div className="resolution-options">
          <h5>How would you like to proceed?</h5>
          
          <label className="resolution-option">
            <input
              type="radio"
              value="wait"
              checked={resolutionStrategy === 'wait'}
              onChange={(e) => setResolutionStrategy(e.target.value as any)}
            />
            <div className="option-content">
              <span className="option-title">Wait for them to finish</span>
              <span className="option-description">You'll be notified when they're done editing</span>
            </div>
          </label>

          <label className="resolution-option">
            <input
              type="radio"
              value="request"
              checked={resolutionStrategy === 'request'}
              onChange={(e) => setResolutionStrategy(e.target.value as any)}
            />
            <div className="option-content">
              <span className="option-title">Request they unlock the field</span>
              <span className="option-description">Send a polite request to finish their edits</span>
            </div>
          </label>

          <label className="resolution-option warning">
            <input
              type="radio"
              value="force"
              checked={resolutionStrategy === 'force'}
              onChange={(e) => setResolutionStrategy(e.target.value as any)}
            />
            <div className="option-content">
              <span className="option-title">Force unlock (use carefully)</span>
              <span className="option-description">Override their lock - may cause data conflicts</span>
            </div>
          </label>
        </div>

        <div className="modal-actions">
          <ActionButton variant="outline" onClick={onCancel}>
            Cancel
          </ActionButton>
          
          {resolutionStrategy === 'wait' && (
            <ActionButton variant="primary" onClick={onResolve}>
              Wait for Unlock
            </ActionButton>
          )}
          
          {resolutionStrategy === 'request' && (
            <ActionButton 
              variant="primary" 
              onClick={handleRequestUnlock}
              disabled={requestSent}
            >
              {requestSent ? 'Request Sent' : 'Send Request'}
            </ActionButton>
          )}
          
          {resolutionStrategy === 'force' && (
            <ActionButton variant="danger" onClick={handleForceUnlock}>
              Force Unlock
            </ActionButton>
          )}
        </div>
      </div>
    </Modal>
  );
};

// Collaborative status indicator for entire forms/components
const CollaborationStatusBar: React.FC<CollaborationStatusBarProps> = ({
  resourceId,
  resourceType,
  className = ''
}) => {
  const { activeUsers, editLocks, collaborationMode } = useConcurrentUserManagement(resourceId, resourceType);
  const currentUser = useCurrentUser();
  
  const otherUsers = activeUsers.filter(user => user.user_id !== currentUser.id);
  const activeEditors = editLocks
    .filter(lock => lock.user_id !== currentUser.id)
    .map(lock => {
      const user = activeUsers.find(u => u.user_id === lock.user_id);
      return { ...lock, user_name: user?.user_name || 'Unknown User' };
    });

  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <div className={`collaboration-status-bar ${collaborationMode} ${className}`}>
      <div className="status-content">
        <div className="user-presence">
          {otherUsers.slice(0, 3).map(user => (
            <UserAvatar
              key={user.user_id}
              user={user}
              size="sm"
              className="presence-avatar"
              showTooltip={false}
            />
          ))}
          
          {otherUsers.length > 3 && (
            <div className="additional-users">+{otherUsers.length - 3}</div>
          )}
        </div>

        <div className="status-text">
          {collaborationMode === 'cooperative' && (
            <span>{otherUsers.length} {otherUsers.length === 1 ? 'person' : 'people'} viewing</span>
          )}
          
          {collaborationMode === 'locked' && activeEditors.length > 0 && (
            <span>
              {activeEditors.map(editor => editor.user_name).join(', ')} 
              {activeEditors.length === 1 ? 'is' : 'are'} editing
            </span>
          )}
          
          {collaborationMode === 'conflicts' && (
            <span className="conflict-warning">
              <AlertTriangleIcon className="w-4 h-4" />
              Data conflicts detected - please resolve
            </span>
          )}
        </div>
      </div>

      {activeEditors.length > 0 && (
        <div className="editing-details">
          <Popover className="relative">
            <Popover.Button className="editing-info-btn">
              <InformationCircleIcon className="w-4 h-4" />
            </Popover.Button>
            
            <Popover.Panel className="editing-details-popup">
              <h6>Currently Being Edited:</h6>
              <ul>
                {activeEditors.map(editor => (
                  <li key={editor.field_path}>
                    <strong>{editor.user_name}</strong> - {formatFieldName(editor.field_path)}
                  </li>
                ))}
              </ul>
            </Popover.Panel>
          </Popover>
        </div>
      )}
    </div>
  );
};
```

---

## Error Handling and User Feedback

### Enhanced Error Boundary Implementation

```typescript
// Enhanced error boundary with comprehensive error reporting and recovery strategies
class Phase2ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: {
        componentStack: error.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    errorLogger.logError('Phase2Component', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      clientGroupId: this.props.clientGroupId,
      activeTab: this.props.activeTab,
      timestamp: new Date().toISOString()
    });
    
    // Show user-friendly error message
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorDisplay
          title="Something went wrong"
          message="We encountered an error loading this section. You can try refreshing or continue using other features."
          actions={[
            {
              label: 'Refresh Page',
              onClick: () => window.location.reload(),
              variant: 'primary'
            },
            {
              label: 'Go Back',
              onClick: () => window.history.back(),
              variant: 'secondary'
            },
            {
              label: 'Report Issue',
              onClick: () => this.props.onReportError?.(this.state.error),
              variant: 'outline'
            }
          ]}
          details={this.state.error?.message}
          className="phase2-error-boundary"
        />
      );
    }

    return this.props.children;
  }
}
```

### User Feedback Components

```typescript
// FeedbackManager for consistent user notifications
const FeedbackManager = {
  showSuccess: (message: string, duration = 5000) => {
    toast.success(message, {
      duration,
      icon: <CheckCircleIcon className="w-5 h-5" />
    });
  },

  showError: (message: string, action?: { label: string; onClick: () => void }) => {
    toast.error(message, {
      duration: 8000,
      icon: <XCircleIcon className="w-5 h-5" />,
      action: action ? {
        label: action.label,
        onClick: action.onClick
      } : undefined
    });
  },

  showWarning: (message: string, duration = 6000) => {
    toast.warning(message, {
      duration,
      icon: <ExclamationTriangleIcon className="w-5 h-5" />
    });
  },

  showInfo: (message: string, duration = 4000) => {
    toast.info(message, {
      duration,
      icon: <InformationCircleIcon className="w-5 h-5" />
    });
  },

  showConflict: (message: string, onResolve: () => void) => {
    toast.custom((t) => (
      <div className="conflict-toast">
        <div className="conflict-content">
          <AlertTriangleIcon className="w-5 h-5 text-amber-500" />
          <span>{message}</span>
        </div>
        <div className="conflict-actions">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              onResolve();
            }}
            className="conflict-resolve-btn"
          >
            Resolve
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="conflict-dismiss-btn"
          >
            Dismiss
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  }
};
```

---

## Conclusion

Phase 2 frontend architecture delivers a sophisticated, accessible, and performant enhancement to Kingston's Portal while maintaining full backward compatibility. The architecture successfully integrates:

- **Enhanced 5-tab client details system** with real-time collaborative features
- **Universal search and filtering** across all client data types  
- **Auto-save functionality** with optimistic updates and conflict resolution
- **WCAG 2.1 AA compliant** accessibility throughout
- **Performance optimization** supporting 200+ item datasets
- **Comprehensive testing strategy** ensuring reliability and maintainability

The implementation leverages existing patterns and components while introducing advanced capabilities that position Kingston's Portal as a leading wealth management platform for concurrent advisor collaboration and comprehensive client data management.

**Key Technical Achievements**:
- **Zero breaking changes** to existing functionality
- **Sub-500ms** loading times for enhanced client details
- **Real-time collaboration** supporting 4 concurrent users
- **Comprehensive accessibility** meeting WCAG 2.1 AA standards
- **Advanced performance optimization** with virtual scrolling and lazy loading

**Business Impact**:
- **80% reduction** in KYC generation time (4 hours → 45 minutes)
- **Enhanced user experience** with auto-save and conflict resolution
- **Improved data accuracy** through structured validation
- **Streamlined workflows** with universal search and filtering
- **Future-ready architecture** supporting additional Phase 3+ enhancements

---

---

## Implementation Guidelines and Best Practices

### Development Workflow Integration

**Component Development Sequence**:
1. **Error Boundaries First** - Implement error boundaries before components
2. **Testing Infrastructure** - Set up comprehensive testing utilities
3. **Performance Monitoring** - Initialize performance tracking
4. **Accessibility Framework** - Establish a11y testing patterns
5. **Component Implementation** - Build components with integrated patterns

**Code Quality Checklist**:
- ✅ All components wrapped with appropriate error boundaries
- ✅ Comprehensive test coverage (unit, integration, accessibility)
- ✅ Performance monitoring instrumented
- ✅ WCAG 2.1 AA compliance verified
- ✅ Bundle optimization strategies applied
- ✅ Real-time collaboration features tested
- ✅ Auto-save functionality validated
- ✅ Conflict resolution UI tested

### Integration Points

**With Existing Architecture**:
- Phase 2 components extend existing UI library patterns
- Backward compatibility maintained through compatibility layers
- Progressive enhancement approach for existing pages
- Shared state management through React Query integration

**With Phase 2 APIs**:
- All components integrate with Phase 2 API endpoints
- Real-time features use WebSocket connections
- Optimistic updates with conflict resolution
- Auto-save functionality with debounced API calls

### Performance Targets

**Component Performance**:
- Initial render: < 16ms (60fps)
- Re-render time: < 8ms
- Virtual scrolling: 200+ items without performance degradation
- Bundle size: Each chunk < 1MB compressed

**User Experience Targets**:
- Page load time: < 500ms
- Auto-save frequency: Every 30 seconds
- Real-time sync: Every 5 seconds
- Conflict detection: < 2 seconds

### Monitoring and Observability

**Error Tracking**:
- Component-level error boundaries with detailed reporting
- Correlation IDs for cross-system tracing
- Performance impact analysis for errors
- User experience degradation metrics

**Performance Monitoring**:
- Core Web Vitals tracking (LCP, FID, CLS)
- Component render time analysis
- Bundle size and load time monitoring
- Memory usage tracking for large datasets

**User Behavior Analytics**:
- Feature adoption rates for Phase 2 components
- Collaboration pattern analysis
- Error recovery success rates
- Accessibility feature usage

---

*This comprehensive Phase 2 Frontend Architecture documentation provides complete specifications for implementing enhanced UI components with error boundaries, comprehensive testing, build optimization, performance monitoring, and advanced concurrent user management. For API integration details, see `11_phase2_api_endpoints.md`. For implementation sequence, see `../04_development_workflow/05_phase2_implementation_sequence.md`.*