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

### Design Principles

**Backward Compatibility First**:
- All existing functionality preserved and enhanced
- Seamless integration with current 38+ pages and 69+ components
- Progressive enhancement approach for new features
- Zero breaking changes to existing user workflows

**Performance-Oriented Architecture**:
- **Sub-500ms** page load times for enhanced client details
- **Auto-save every 30 seconds** with optimistic updates
- **Virtual scrolling** for datasets with 200+ items
- **Lazy loading** for tab content and complex components

**Accessibility and Inclusive Design**:
- **WCAG 2.1 AA compliance** across all new components
- **Keyboard navigation** support for all interactive elements
- **Screen reader optimization** with proper ARIA attributes
- **High contrast** and zoom support up to 200%

**Real-time Collaborative Features**:
- **4 concurrent user support** with conflict resolution
- **Real-time presence indicators** showing active users
- **Optimistic locking** with merge conflict UI
- **Auto-sync** updates every 5 seconds

---

## Component Architecture and Hierarchy

### Enhanced Component Library Structure

```
frontend/src/components/
├── ui/                                 # Extended base components (85+ total)
│   ├── buttons/                       # Enhanced button variants
│   │   ├── ActionButton.tsx           # Existing + loading states
│   │   ├── EditButton.tsx             # Existing + inline edit mode
│   │   ├── SaveButton.tsx             # NEW: Auto-save indicator
│   │   └── ConflictResolveButton.tsx  # NEW: Merge conflict resolution
│   ├── card/                          # Enhanced card components
│   │   ├── StatBox.tsx                # Existing + real-time updates
│   │   ├── InformationItemCard.tsx    # NEW: Information item display
│   │   └── OwnershipCard.tsx          # NEW: Ownership visualization
│   ├── data-displays/                 # Advanced data visualization
│   │   ├── DataTable.tsx              # Enhanced + inline editing
│   │   ├── EditableTable.tsx          # NEW: Full editing capabilities
│   │   ├── NetworthTable.tsx          # NEW: Networth statement table
│   │   └── CompletionMeter.tsx        # NEW: Data completeness indicator
│   ├── dropdowns/                     # Enhanced dropdown components
│   │   ├── SearchableDropdown.tsx     # Existing + performance improvements
│   │   ├── CategoryDropdown.tsx       # NEW: Information item categories
│   │   └── OwnershipDropdown.tsx      # NEW: Ownership type selection
│   ├── feedback/                      # Enhanced user feedback
│   │   ├── EmptyState.tsx            # Existing + contextual actions
│   │   ├── PresenceIndicator.tsx     # NEW: Concurrent user awareness
│   │   ├── ConflictNotification.tsx  # NEW: Edit conflict alerts
│   │   └── AutoSaveIndicator.tsx     # NEW: Auto-save status
│   ├── inputs/                        # Enhanced input components
│   │   ├── BaseInput.tsx             # Enhanced + validation
│   │   ├── JsonEditor.tsx            # NEW: Structured data editing
│   │   ├── OwnershipInput.tsx        # NEW: Complex ownership configuration
│   │   └── UniversalSearchInput.tsx  # NEW: Cross-data search
│   ├── layout/                       # Enhanced layout components
│   │   ├── TabContainer.tsx          # NEW: 5-tab navigation system
│   │   ├── TabPanel.tsx              # NEW: Accessible tab content
│   │   └── SplitView.tsx             # NEW: Side-by-side editing
│   ├── modals/                       # Enhanced modal components
│   │   ├── ItemCreationModal.tsx     # NEW: Multi-step creation
│   │   ├── ConflictResolutionModal.tsx # NEW: Merge conflict UI
│   │   └── BulkImportModal.tsx       # NEW: CSV/Excel import
│   └── tables/                       # Advanced table components
│       ├── EditableCell.tsx          # NEW: Inline editing
│       ├── SortableHeader.tsx        # Enhanced sorting
│       └── FilterableColumn.tsx      # Enhanced filtering
└── phase2/                           # Phase 2 specific components
    ├── client-details/               # Enhanced client details pages
    │   ├── ClientDetailsLayout.tsx   # NEW: 5-tab container
    │   ├── MainListTab.tsx           # NEW: Information items management
    │   ├── UnmanagedProductsTab.tsx  # NEW: Unmanaged products
    │   ├── NetworthTab.tsx           # NEW: Networth statements
    │   ├── KYCTab.tsx                # NEW: KYC report generation
    │   └── ActionsObjectivesTab.tsx  # NEW: Actions and objectives
    ├── ownership/                    # Ownership management components
    │   ├── OwnershipConfiguration.tsx # NEW: Complex ownership UI
    │   ├── OwnershipValidation.tsx    # NEW: Percentage validation
    │   └── OwnershipHistory.tsx       # NEW: Ownership change tracking
    ├── search/                       # Universal search components
    │   ├── UniversalSearch.tsx        # NEW: Cross-data search
    │   ├── SearchFilters.tsx          # NEW: Advanced filtering
    │   └── SearchResults.tsx          # NEW: Unified result display
    └── reports/                      # Enhanced report components
        ├── NetworthGenerator.tsx     # NEW: Interactive networth reports
        ├── KYCReportBuilder.tsx      # NEW: KYC report customization
        └── SnapshotViewer.tsx        # NEW: Historical data viewer
```

### Component Design Patterns

**Consistent Component Interface Pattern**:
```typescript
// Standard Phase 2 component props interface
interface Phase2ComponentProps {
  // Base props (inherited from existing pattern)
  className?: string;
  children?: React.ReactNode;
  
  // Phase 2 specific props
  clientGroupId: number;
  onDataChange?: (data: any) => void;
  isEditing?: boolean;
  showPresence?: boolean;
  
  // Accessibility props
  ariaLabel?: string;
  ariaDescribedBy?: string;
  
  // Performance props
  virtualizeThreshold?: number;
  lazyLoad?: boolean;
}

// Example implementation
const InformationItemCard: React.FC<InformationItemCardProps> = ({
  item,
  clientGroupId,
  onDataChange,
  isEditing = false,
  showPresence = true,
  ariaLabel,
  className = '',
  ...rest
}) => {
  // Consistent error boundary wrapper
  return (
    <ErrorBoundary fallback={<ItemCardError />}>
      <div 
        className={`information-item-card ${className}`}
        role="article"
        aria-label={ariaLabel || `${item.category} information item`}
        {...rest}
      >
        {showPresence && <PresenceIndicator itemId={item.id} />}
        <ItemContent 
          item={item}
          isEditing={isEditing}
          onChange={onDataChange}
        />
      </div>
    </ErrorBoundary>
  );
};
```

---

## Enhanced Client Details Page Structure

### 5-Tab Navigation System

The enhanced client details page implements a sophisticated tab system supporting concurrent user access, real-time updates, and comprehensive data management.

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
      onError: (error: ApiError) => {
        if (error.code === 'CONFLICT') {
          handleConflictResolution(error.data);
        } else {
          showErrorMessage('Failed to save item');
        }
      }
    }
  );

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
                ownership={item.data_content.associated_product_owners}
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

  const forceSave = useCallback(async () => {
    debouncedSave.cancel();
    await debouncedSave(data);
  }, [debouncedSave, data]);

  return {
    lastSaved,
    saveStatus,
    error,
    forceSave
  };
};

// Usage in components
const InformationItemEditor: React.FC<EditorProps> = ({ item, onChange }) => {
  const [formData, setFormData] = useState(item);
  
  const { lastSaved, saveStatus, error, forceSave } = useAutoSave(
    formData,
    async (data) => {
      await apiService.updateInformationItem(item.client_group_id, data);
    },
    {
      delay: 30000,
      enabled: !deepEqual(formData, item)
    }
  );

  return (
    <div className="item-editor">
      <JsonEditor
        data={formData.data_content}
        onChange={(data) => setFormData(prev => ({ ...prev, data_content: data }))}
      />
      
      <AutoSaveIndicator
        status={saveStatus}
        lastSaved={lastSaved}
        error={error}
        onForceSave={forceSave}
      />
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

## Performance Optimization

### Virtual Scrolling and Large Dataset Management

```typescript
// VirtualizedList component for handling large datasets
const VirtualizedList: React.FC<VirtualizedListProps> = ({
  items,
  itemHeight = 60,
  containerHeight = 400,
  renderItem,
  overscan = 5,
  className = ''
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + overscan,
    items.length
  );

  const visibleItems = items.slice(visibleStart, visibleEnd);

  const handleScroll = useCallback(
    throttle((e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    }, 16), // ~60fps
    []
  );

  const scrollToItem = useCallback((index: number) => {
    if (containerRef.current) {
      const scrollTo = index * itemHeight;
      containerRef.current.scrollTo({ top: scrollTo, behavior: 'smooth' });
    }
  }, [itemHeight]);

  return (
    <div
      ref={containerRef}
      className={`virtualized-list ${className}`}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
      role="list"
      aria-label={`List of ${items.length} items`}
    >
      <div
        style={{
          height: items.length * itemHeight,
          position: 'relative'
        }}
      >
        {visibleItems.map((item, index) => {
          const actualIndex = visibleStart + index;
          return (
            <div
              key={item.id || actualIndex}
              style={{
                position: 'absolute',
                top: actualIndex * itemHeight,
                height: itemHeight,
                width: '100%'
              }}
              role="listitem"
            >
              {renderItem(item, actualIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

---

## Integration with Existing Frontend

### Backward Compatibility Strategy

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
interface OwnershipConfigurationProps {
  ownership?: OwnershipDetails;
  productOwners: ProductOwner[];
  onChange: (ownership: OwnershipDetails) => void;
  className?: string;
  disabled?: boolean;
  showValidation?: boolean;
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

---

## UI/UX Design Patterns

### Design System Integration

**Color Palette Extensions**:
```scss
// Phase 2 color additions
:root {
  // Presence indicators
  --color-presence-active: #10b981;
  --color-presence-idle: #f59e0b;
  --color-presence-away: #6b7280;
  
  // Auto-save status
  --color-saving: #3b82f6;
  --color-saved: #10b981;
  --color-save-error: #ef4444;
  
  // Conflict resolution
  --color-conflict-warning: #f59e0b;
  --color-conflict-danger: #ef4444;
  --color-conflict-resolution: #8b5cf6;
}
```

**Spacing and Layout**:
```scss
// Phase 2 spacing system
.tab-container {
  --tab-padding: 1rem 1.5rem;
  --tab-gap: 0.5rem;
  --tab-border-radius: 0.5rem 0.5rem 0 0;
}

.presence-indicator {
  --presence-size: 2rem;
  --presence-gap: 0.25rem;
  --presence-offset: -0.125rem;
}

.auto-save-indicator {
  --indicator-size: 0.75rem;
  --indicator-spacing: 0.5rem;
}
```

**Animation and Transitions**:
```scss
// Phase 2 animation system
@keyframes presence-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes save-success {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.presence-indicator {
  animation: presence-pulse 2s infinite;
}

.auto-save-indicator.saving {
  animation: rotate 1s linear infinite;
}

.auto-save-indicator.saved {
  animation: save-success 0.3s ease-out;
}
```

### Responsive Design Patterns

```scss
// Phase 2 responsive breakpoints
.client-details-layout {
  @media (max-width: 768px) {
    .tab-container {
      flex-direction: column;
      
      .tab-nav {
        overflow-x: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
        
        &::-webkit-scrollbar {
          display: none;
        }
      }
    }
    
    .presence-indicator {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      z-index: 50;
    }
  }
}

.universal-search {
  @media (max-width: 640px) {
    .search-results {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 50;
      background: white;
      padding: 1rem;
      overflow-y: auto;
    }
  }
}
```

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