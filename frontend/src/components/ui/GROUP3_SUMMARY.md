# Group 3: Selection Family Components

## Overview
Group 3 components are designed for selecting one or more options from predefined lists, with support for creating new options. They follow the same design system as Groups 1 & 2 (purple theme #4B2D83, consistent heights, accessibility).

## Components

### 1. BaseDropdown (Single Select)
```tsx
import { BaseDropdown } from '@/components/ui';

<BaseDropdown
  label="Country"
  options={[
    { value: 'us', label: 'United States' },
    { value: 'ca', label: 'Canada' },
    { value: 'uk', label: 'United Kingdom' }
  ]}
  value={selectedCountry}
  onChange={setSelectedCountry}
  placeholder="Select a country..."
  required
/>
```

**Use Cases:**
- Country/region selection
- Category selection
- Status dropdowns
- Priority levels
- Any single-choice selection

### 2. MultiSelectDropdown (Multi-select)
```tsx
import { MultiSelectDropdown } from '@/components/ui';

<MultiSelectDropdown
  label="Tags"
  options={tagOptions}
  values={selectedTags}
  onChange={setSelectedTags}
  placeholder="Select tags..."
  maxSelectedDisplay={3}
/>
```

**Use Cases:**
- Tagging systems
- Permission selection
- Category filters
- Multi-attribute selection
- Any multi-choice selection

### 3. CreatableDropdown (Single + Create)
```tsx
import { CreatableDropdown } from '@/components/ui';

<CreatableDropdown
  label="Product Owner"
  options={existingOwners}
  value={selectedOwner}
  onChange={setSelectedOwner}
  onCreateOption={handleCreateOwner}
  placeholder="Select or create owner..."
  createLabel="Create owner"
/>
```

**Use Cases:**
- Product owner selection (your exact use case!)
- Client assignment
- Category creation
- Tag creation
- Any dropdown where users might need new options

### 4. CreatableMultiSelect (Multi-select + Create)
```tsx
import { CreatableMultiSelect } from '@/components/ui';

<CreatableMultiSelect
  label="Skills"
  options={existingSkills}
  values={selectedSkills}
  onChange={setSelectedSkills}
  onCreateOption={handleCreateSkill}
  placeholder="Select or create skills..."
/>
```

**Use Cases:**
- Skills/competency selection
- Tag systems with creation
- Multi-category assignment
- Dynamic list building

### 5. ComboDropdown (Editable Dropdown)
```tsx
import { ComboDropdown } from '@/components/ui';

<ComboDropdown
  label="Company"
  options={companyOptions}
  value={companyName}
  onChange={setCompanyName}
  onSelect={handleCompanySelect}
  allowCustomValue={true}
  placeholder="Type company name..."
/>
```

**Use Cases:**
- Company name entry with suggestions
- Address autocomplete
- Product name with suggestions
- Any text input with helpful options

## Design Specifications

### Heights
- **sm**: 32px (h-8)
- **md**: 40px (h-10) - Default
- **lg**: 48px (h-12)

### Colors
- **Primary**: #4B2D83 (matching Groups 1 & 2)
- **Focus Ring**: primary-700/10
- **Chips**: primary-700 background
- **Error**: red-500 border, red-50 background
- **Success**: green-500 border

### Typography
- **Input Text**: 14px (text-sm)
- **Helper Text**: 12px (text-xs)
- **Chips**: 12px (text-xs)

### Icons
- **Size**: 16px (h-4 w-4)
- **Chevrons**: Up/Down for open state
- **Search**: MagnifyingGlassIcon
- **Remove**: XMarkIcon
- **Create**: PlusIcon

## Accessibility Features
- ARIA labels and roles
- Keyboard navigation (Arrow keys, Enter, Escape)
- Screen reader support
- Focus management
- High contrast support

## Group 2 vs Group 3: When to Use Which

### Use Group 2 (Search Input Family) When:
1. **Primary purpose is searching/filtering**
   - Finding existing records
   - Filtering large datasets
   - Live search results
   - Content discovery

2. **Examples:**
   - Global site search
   - Product search in catalog
   - Client lookup
   - Document search
   - Filtering transactions

### Use Group 3 (Selection Family) When:
1. **Primary purpose is selecting options**
   - Choosing from predefined lists
   - Form field selection
   - Configuration options
   - Assignment/categorization

2. **Examples:**
   - Status dropdowns
   - Category selection
   - User assignment
   - Settings configuration
   - Product owner selection (your use case!)

### Key Differences:

| Aspect | Group 2 (Search) | Group 3 (Selection) |
|--------|------------------|---------------------|
| **Purpose** | Find/filter content | Select from options |
| **Input Behavior** | Free-text search | Structured selection |
| **Results** | Dynamic search results | Fixed option lists |
| **Primary Action** | Search → Navigate | Select → Set value |
| **Data Source** | API/search index | Predefined options |
| **Creation** | Not applicable | Can create new options |

## Component Mapping Examples

### Your Kingstons Portal Use Cases:

#### Group 2 Applications:
- **Global Search**: Finding clients, products, documents
- **Filter Search**: Filtering tables/lists
- **Autocomplete Search**: Quick lookups

#### Group 3 Applications:
- **Product Owner Selection**: Use `CreatableDropdown`
- **Client Status**: Use `BaseDropdown`
- **Product Categories**: Use `MultiSelectDropdown`
- **Investment Types**: Use `BaseDropdown`
- **Risk Categories**: Use `MultiSelectDropdown`
- **User Permissions**: Use `MultiSelectDropdown`

### Decision Tree:
```
Is the primary goal to...
├── Search for existing content?
│   └── Use Group 2 (SearchInput, FilterSearch, etc.)
└── Select from options/categories?
    ├── Single selection?
    │   ├── Need to create new options?
    │   │   └── Use CreatableDropdown
    │   └── Just select from existing?
    │       └── Use BaseDropdown
    └── Multiple selection?
        ├── Need to create new options?
        │   └── Use CreatableMultiSelect
        └── Just select from existing?
            └── Use MultiSelectDropdown
```

## Implementation Notes

### All Group 3 components support:
- Loading states
- Error handling
- Disabled states
- Custom validation
- Responsive design
- Keyboard navigation
- Screen reader accessibility

### Creation Workflow:
```tsx
const handleCreateOption = async (inputValue: string) => {
  // Create new option via API
  const newOption = await createProductOwner(inputValue);
  
  // Return the new option
  return {
    value: newOption.id,
    label: newOption.name
  };
};
```

This creates a seamless experience where users can search existing options and create new ones without leaving the form! 