# Component Showcase - Simplified Implementation Plan

**Purpose:** Internal developer tool to showcase all shared/reused UI components
**Users:** Development team only (not client-facing)
**Timeline:** 10-15 hours total implementation
**Approach:** Simple, fast, maintainable

---

## Overview

A single-page visual reference showing all 50+ UI components from `components/ui/` to help developers quickly identify and use existing components for consistency in continued development.

### What This Delivers

✅ **Visual showcase of all 50+ components**
✅ **Import paths for easy copy-paste**
✅ **2-3 visual variants per component**
✅ **Simple usage code snippets**
✅ **8 clear categories**
✅ **Basic search functionality**
✅ **Fast implementation (10-15 hours)**
✅ **Easy to maintain (5 min per new component)**

### What This Avoids (No Over-Engineering)

❌ Complex scroll spy navigation
❌ Interactive prop controls
❌ Syntax highlighting libraries (Prism.js)
❌ 20-file modular architecture
❌ Advanced search/filter with keyboard shortcuts
❌ Full WCAG 2.1 AA compliance (internal tool)
❌ Mobile-first responsive design
❌ Code splitting / lazy loading

---

## File Structure (Minimal)

```
frontend/src/pages/
  ComponentShowcase.tsx          # Main showcase page (400-500 lines)

frontend/src/components/showcase/
  ComponentCard.tsx              # Reusable card wrapper (100-150 lines)
```

**Total:** 2 files, ~600 lines maximum

---

## Component Card Design

Simple, reusable card that shows:
1. Component name (h3 heading)
2. Import path (code block for copy-paste)
3. Visual demo area (2-3 variants rendered)
4. Optional: Collapsible code snippet

```tsx
interface ComponentCardProps {
  name: string;
  importPath: string;
  code?: string;
  children: React.ReactNode;
}

export const ComponentCard = ({ name, importPath, code, children }: ComponentCardProps) => (
  <div className="border rounded-lg p-6 bg-white hover:shadow-md transition-shadow">
    {/* Header */}
    <h3 className="text-lg font-semibold mb-2">{name}</h3>

    {/* Import path */}
    <code className="text-sm bg-gray-100 px-2 py-1 rounded block mb-4">
      {importPath}
    </code>

    {/* Visual demo */}
    <div className="space-y-3 mb-4 p-4 bg-gray-50 rounded">
      {children}
    </div>

    {/* Optional code snippet */}
    {code && (
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-blue-600">
          Show code
        </summary>
        <pre className="mt-2 bg-gray-800 text-gray-100 p-3 rounded text-xs overflow-x-auto">
          <code>{code}</code>
        </pre>
      </details>
    )}
  </div>
);
```

---

## Layout Strategy

```tsx
// ComponentShowcase.tsx structure

export default function ComponentShowcase() {
  const [search, setSearch] = useState('');

  // Simple filter function
  const filterComponents = (componentName: string) => {
    return componentName.toLowerCase().includes(search.toLowerCase());
  };

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <h1 className="text-3xl font-bold mb-2">UI Component Library</h1>
      <p className="text-gray-600 mb-6">Visual reference for all shared components</p>

      {/* Search */}
      <input
        className="w-full max-w-md mb-8 px-4 py-2 border rounded-lg"
        placeholder="Search components..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Category sections */}
      <section id="inputs" className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filterComponents('BaseInput') && (
            <ComponentCard
              name="BaseInput"
              importPath="import { BaseInput } from '@/components/ui'"
              code={`<BaseInput
  placeholder="Enter text"
  value={value}
  onChange={setValue}
/>`}
            >
              <BaseInput placeholder="Default input" />
              <BaseInput placeholder="Small size" size="sm" />
              <BaseInput placeholder="Disabled" disabled />
            </ComponentCard>
          )}
          {/* More input components */}
        </div>
      </section>

      {/* Repeat for other categories */}
    </div>
  );
}
```

---

## Implementation Plan

### Phase 1: Foundation (3-4 hours)

#### Task 1.1: Create ComponentShowcase.tsx page structure (1.5 hours)
- Create new file: `frontend/src/pages/ComponentShowcase.tsx`
- Set up basic grid layout with category headers
- Add simple text search input at top
- Create 8 collapsible category sections
- Import all components from `@/components/ui`

#### Task 1.2: Create ComponentCard.tsx wrapper (1 hour)
- Create new file: `frontend/src/components/showcase/ComponentCard.tsx`
- Implement props: `name`, `importPath`, `code?`, `children`
- Style: Simple border, padding, hover effect
- Add collapsible code snippet section (using `<details>` element)

#### Task 1.3: Add basic search functionality (0.5 hours)
- Single `useState` for search term
- Filter components by name (simple string match)
- Hide/show ComponentCards based on search
- No debouncing needed (small dataset)

### Phase 2: Component Demonstrations (5-7 hours)

#### Task 2.1: Inputs Category (1 hour)
**Components:** BaseInput, NumberInput, TextArea, DateInput, PasswordInput, InputLabel, InputError, InputGroup

**Pattern:**
```tsx
<ComponentCard
  name="BaseInput"
  importPath="import { BaseInput } from '@/components/ui'"
  code={`<BaseInput placeholder="Enter text" />`}
>
  <BaseInput placeholder="Default input" />
  <BaseInput placeholder="With value" value="Sample text" />
  <BaseInput placeholder="Small" size="sm" />
</ComponentCard>
```

#### Task 2.2: Buttons Category (0.5 hours)
**Components:** Button, ActionButton, EditButton, AddButton, DeleteButton, LapseButton

**Show variants:** Default, different sizes (sm/md/lg), loading state, disabled

#### Task 2.3: Dropdowns Category (1.5 hours)
**Components:** BaseDropdown, MultiSelectDropdown, CreatableDropdown, CreatableMultiSelect, ComboDropdown, SearchableDropdown, FilterDropdown

**Create simple mock data:**
```tsx
const mockOptions = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  { value: '3', label: 'Option 3' }
];
```

#### Task 2.4: Search Components (0.5 hours)
**Components:** SearchInput, FilterSearch, AutocompleteSearch, GlobalSearch

**Show:** Default state, with placeholder, small size

#### Task 2.5: Feedback Category (1 hour)
**Components:** Skeleton, StatBoxSkeleton, ChartSkeleton, TableSkeleton, EmptyState, ErrorDisplay, ErrorStateNetwork, ErrorStateServer

**Show:** Static examples of loading states, empty states, error states

#### Task 2.6: Card Category (0.5 hours)
**Components:** Card, StatCard, StatBox, ChangeIndicator

**Show:** With sample data (numbers, percentages, trends)

#### Task 2.7: Data Displays Category (1 hour)
**Components:** DataTable, FundDistributionChart

**Create mock table data, show basic table variants**

#### Task 2.8: Table Controls Category (0.5 hours)
**Components:** TableFilter, TableSort

**Show:** In context of table header

#### Task 2.9: Remaining Categories (1 hour - optional)
**date/, modals/, navigation/, badges/, tables/**

Add if time permits, or leave for future enhancement

### Phase 3: Code Snippets (2 hours)

#### Task 3.1: Add usage code to ComponentCard (0.5 hours)
- Accept optional `code` prop (string)
- Display in simple `<pre><code>` block
- No syntax highlighting (just monospace with dark background)
- Use `<details>` element for collapsible behavior

#### Task 3.2: Add code snippets to all components (1.5 hours)
- Add simple JSX example to each component
- Focus on most common usage pattern
- Keep examples copy-paste ready
- No need for complex examples

**Example:**
```tsx
code={`<BaseInput
  placeholder="Enter text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>`}
```

### Phase 4: Polish & Navigation (2-3 hours)

#### Task 4.1: Add category navigation (1 hour)
**Option A (Simple):** Top navigation with anchor links
```tsx
<nav className="mb-8">
  <a href="#inputs">Inputs</a>
  <a href="#buttons">Buttons</a>
  {/* ... */}
</nav>
```

**Option B (Better UX):** Fixed sidebar with jump links
```tsx
<aside className="fixed left-0 top-20 w-48">
  <nav className="space-y-2">
    <a href="#inputs" className="block px-4 py-2">Inputs</a>
    <a href="#buttons" className="block px-4 py-2">Buttons</a>
    {/* ... */}
  </nav>
</aside>
```

Add smooth scroll behavior with CSS:
```css
html {
  scroll-behavior: smooth;
}
```

#### Task 4.2: Styling refinement (1 hour)
- Ensure consistent spacing between sections
- Add light background colors per category for visual separation
- Responsive grid: 3 cols desktop, 2 tablet, 1 mobile
- Ensure code blocks don't overflow on mobile

#### Task 4.3: Add route and navigation link (0.5 hours)
- Add `/components` route in `App.tsx`
- Add link in Sidebar navigation (under "Dev Tools" section)
- Test navigation works correctly

---

## Code Patterns

### Pattern 1: Inline Component Demos (No State Management)
```tsx
// Hardcode variants - no complex prop controls needed
<ComponentCard
  name="ActionButton"
  importPath="import { ActionButton } from '@/components/ui'"
>
  <ActionButton>Default</ActionButton>
  <ActionButton size="sm">Small</ActionButton>
  <ActionButton size="lg">Large</ActionButton>
  <ActionButton disabled>Disabled</ActionButton>
  <ActionButton loading>Loading</ActionButton>
</ComponentCard>
```

### Pattern 2: Mock Data (Keep It Simple)
```tsx
// Simple mock data defined inline
const mockOptions = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  { value: '3', label: 'Option 3' }
];

const mockTableData = [
  { id: 1, name: 'John Doe', role: 'Admin' },
  { id: 2, name: 'Jane Smith', role: 'User' }
];

<ComponentCard name="SearchableDropdown" importPath="...">
  <SearchableDropdown options={mockOptions} placeholder="Select..." />
</ComponentCard>
```

### Pattern 3: Code Snippets (String Literals)
```tsx
// Simple string literals, no template processing
<ComponentCard
  name="BaseInput"
  importPath="import { BaseInput } from '@/components/ui'"
  code={`<BaseInput
  placeholder="Enter text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>`}
>
  <BaseInput placeholder="Default" />
</ComponentCard>
```

### Pattern 4: Category Sections
```tsx
<section id="inputs" className="mb-12">
  <h2 className="text-2xl font-semibold mb-4 pb-2 border-b">
    Inputs
  </h2>
  <p className="text-gray-600 mb-4">
    Form input components for data entry
  </p>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {/* ComponentCards */}
  </div>
</section>
```

---

## Component Coverage

### Phase 2 Scope (Core 8 Categories)

1. **inputs/** (8 components) - 1 hour
   - BaseInput, NumberInput, TextArea, DateInput, PasswordInput, InputLabel, InputError, InputGroup

2. **buttons/** (6 components) - 0.5 hours
   - Button, ActionButton, EditButton, AddButton, DeleteButton, LapseButton

3. **dropdowns/** (7 components) - 1.5 hours
   - BaseDropdown, MultiSelectDropdown, CreatableDropdown, CreatableMultiSelect, ComboDropdown, SearchableDropdown, FilterDropdown

4. **search/** (4 components) - 0.5 hours
   - SearchInput, FilterSearch, AutocompleteSearch, GlobalSearch

5. **feedback/** (8 components) - 1 hour
   - Skeleton, StatBoxSkeleton, ChartSkeleton, TableSkeleton, EmptyState, ErrorDisplay, ErrorStateNetwork, ErrorStateServer

6. **card/** (4 components) - 0.5 hours
   - Card, StatCard, StatBox, ChangeIndicator

7. **data-displays/** (2 components) - 1 hour
   - DataTable, FundDistributionChart

8. **table-controls/** (2 components) - 0.5 hours
   - TableFilter, TableSort

**Total Phase 2:** 41 components in ~6 hours

### Optional Categories (Future Enhancement)

9. **date/** - MiniYearSelector, EnhancedMonthHeader
10. **modals/** - ModalShell
11. **navigation/** - TabNavigation
12. **badges/** - StatusBadge
13. **tables/** - SortableColumnHeader, TableSortHeader, SkeletonTable, StandardTable

---

## Maintenance Strategy

### Adding New Components (5 minutes)
1. Open `ComponentShowcase.tsx`
2. Find appropriate category section
3. Add new `<ComponentCard>` with 2-3 variants
4. Add code snippet if helpful
5. Done!

**Example:**
```tsx
// In the Buttons section, add:
<ComponentCard
  name="NewButton"
  importPath="import { NewButton } from '@/components/ui'"
  code={`<NewButton>Click me</NewButton>`}
>
  <NewButton>Default</NewButton>
  <NewButton size="sm">Small</NewButton>
</ComponentCard>
```

### Creating New Categories (10 minutes)
1. Add new `<section>` in ComponentShowcase.tsx
2. Follow existing pattern
3. Add category link to navigation
4. Add 2-3 components to start

---

## Timeline Breakdown

| Phase | Tasks | Time Estimate |
|-------|-------|---------------|
| **1. Foundation** | Page structure, ComponentCard, search | 3-4 hours |
| **2. Component Demos** | All 40+ components with variants | 5-7 hours |
| **3. Code Snippets** | Usage examples for components | 2 hours |
| **4. Polish** | Navigation, styling, routing | 2-3 hours |
| **TOTAL** | | **12-16 hours** |

**Realistic estimate: 10-15 hours** (depending on developer familiarity with components)

---

## Success Criteria

1. ✅ Developer can find any UI component in <30 seconds
2. ✅ Developer can copy import path immediately
3. ✅ Developer can see visual variants at a glance
4. ✅ Developer can copy basic usage code
5. ✅ Page loads in <2 seconds
6. ✅ Adding new component takes <5 minutes
7. ✅ Total implementation under 15 hours
8. ✅ No external dependencies added
9. ✅ Follows existing project patterns
10. ✅ Easy to maintain long-term

---

## What You Get

**A simple, practical developer tool that:**
- Shows all 50+ components visually in one place
- Provides import paths for easy copy-paste
- Includes basic usage examples
- Has simple search to find components quickly
- Takes 10-15 hours to build
- Takes 5 minutes to add new components
- Requires zero maintenance overhead
- Uses no external dependencies

**This is NOT:**
- A comprehensive documentation system
- A client-facing demo tool
- An interactive playground
- Over-engineered architecture

---

## Next Steps

1. **Review & approve this simplified plan**
2. **Start Phase 1: Foundation** (3-4 hours)
   - Create ComponentShowcase.tsx
   - Create ComponentCard.tsx
   - Add basic search
3. **Implement Phase 2: Component Demos** (5-7 hours)
   - Add all 40+ components systematically
4. **Complete Phases 3-4: Polish** (4-5 hours)
   - Add code snippets
   - Add navigation
   - Style and route

**Total time commitment: 10-15 hours for a fully functional internal component library showcase.**

---

*This plan prioritizes speed, simplicity, and maintainability over feature completeness. It delivers exactly what's needed for an internal developer tool without over-engineering.*
