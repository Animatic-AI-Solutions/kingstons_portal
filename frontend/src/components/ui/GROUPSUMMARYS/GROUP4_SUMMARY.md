# Group 4: Action Button Family Components

## Overview
Group 4 consists of specialized action button components designed for consistent user interactions across the Kingstons Portal application. These components provide standardized styling, behavior, and accessibility while supporting multiple design patterns and context-aware functionality.

## Design System Consistency

### Visual Standards
- **Heights**: 20px (mini), 24px (xs), 28px (icon), 32px (sm), 40px (md), 48px (lg)
- **Colors**: Context-specific color mapping with consistent hover/focus states
- **Typography**: 12px (xs), 14px (sm/md), 16px (lg) with medium font weight
- **Icons**: 12px (mini), 14px (xs), 16px (icon/sm/md), 20px (lg) from Heroicons
- **Border Radius**: 6px (rounded-md) for modern appearance
- **Shadows**: Consistent focus rings and hover effects

### Color Mapping
- **Edit**: Purple (#4B2D83) - Primary brand color
- **Add**: Green (#059669) - Success/positive action
- **Delete**: Red (#DC2626) - Danger/destructive action  
- **Lapse**: Orange (#EA580C) - Warning/caution action
- **Save**: Green (#059669) - Success confirmation
- **Cancel**: Gray (#6B7280) - Neutral/secondary action

## Component Architecture

### 1. ActionButton (Base Component)
**Purpose**: Universal action button with variant-based styling and behavior

**Key Features**:
- Six action variants: `edit`, `add`, `delete`, `lapse`, `save`, `cancel`
- Six size options: `mini`, `xs`, `icon`, `sm`, `md`, `lg`
- Three design patterns: `minimal`, `balanced`, `descriptive`
- Context-aware text generation
- Icon-only mode support
- Table context optimization
- Loading and disabled states

**Props Interface**:
```typescript
interface ActionButtonProps {
  variant: 'edit' | 'add' | 'delete' | 'lapse' | 'save' | 'cancel';
  size?: 'mini' | 'xs' | 'icon' | 'sm' | 'md' | 'lg';
  design?: 'minimal' | 'balanced' | 'descriptive';
  iconOnly?: boolean;
  tableContext?: boolean;
  compact?: boolean;
  context?: string;
  loading?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
}
```

### 2. Specialized Button Components

#### EditButton
```tsx
<EditButton 
  design="balanced" 
  context="Client" 
  onClick={handleEdit}
/>
```

#### AddButton  
```tsx
<AddButton 
  design="descriptive" 
  context="Product" 
  size="lg"
  onClick={handleAdd}
/>
```

#### DeleteButton
```tsx
<DeleteButton 
  design="minimal" 
  tableContext 
  size="xs"
  onClick={handleDelete}
/>
```

#### LapseButton
```tsx
<LapseButton 
  context="Policy"
  loading={isLapsing}
  onClick={handleLapse}
/>
```

## Design Patterns

### 1. Minimal Design
**Use Case**: Table rows, inline actions, space-constrained layouts
**Characteristics**:
- Light background colors with colored text
- Compact padding and sizing
- Icon-first approach
- Abbreviated text for small sizes

**Example**:
```tsx
<EditButton design="minimal" size="xs" tableContext />
// Renders: Light purple background, purple text, "Edit" or "E"
```

### 2. Balanced Design (Default)
**Use Case**: Standard forms, modal dialogs, general UI
**Characteristics**:
- Equal emphasis on icon and text
- Standard sizing and padding
- Clear but not overwhelming
- Context-aware labeling

**Example**:
```tsx
<AddButton design="balanced" context="Client" />
// Renders: Green button with plus icon, "Add Client"
```

### 3. Descriptive Design
**Use Case**: Primary actions, accessibility-focused interfaces
**Characteristics**:
- Clear, descriptive text
- Larger button sizes
- High accessibility compliance
- Full context in button text

**Example**:
```tsx
<DeleteButton design="descriptive" context="Record" />
// Renders: Red button with trash icon, "Delete Record"
```

## Size System

### Table-Optimized Sizes
- **mini (20px)**: Ultra-compact for dense tables
- **xs (24px)**: Compact table actions
- **icon (28px)**: Square icon-only buttons

### Standard Sizes
- **sm (32px)**: Small forms and secondary actions
- **md (40px)**: Default size for most use cases
- **lg (48px)**: Primary actions and prominent buttons

### Auto-Sizing Logic
```typescript
// Automatic size selection based on context
<EditButton tableContext />        // Auto-selects 'xs'
<AddButton compact />              // Auto-selects 'mini'
<DeleteButton />                   // Uses default 'md'
```

## Context-Aware Features

### Smart Text Generation
```typescript
// Base text
<EditButton />                     // "Edit"

// Context-aware text
<EditButton context="Client" />    // "Edit" (balanced)
<EditButton context="Client" design="descriptive" /> // "Edit Client"
<AddButton context="Product" />    // "Add Product"
<AddButton context="Product" design="descriptive" /> // "Add New Product"
```

### Table Context Optimization
```tsx
<EditButton tableContext size="xs" />
// Automatically applies:
// - Minimal design pattern
// - Compact spacing
// - Optimized hover states
// - Reduced text (if applicable)
```

## Accessibility Features

### Keyboard Navigation
- **Tab**: Focus navigation between buttons
- **Enter/Space**: Activate button action
- **Escape**: Cancel focus (where applicable)

### Screen Reader Support
- Semantic button elements
- Descriptive ARIA labels
- Action context announcements
- Loading state announcements

### WCAG Compliance
- AA color contrast ratios (4.5:1 minimum)
- Minimum touch target size (44x44px for interactive elements)
- Focus indicators meet visibility requirements
- High contrast mode support

## Integration Patterns

### Table Row Actions
```tsx
// Standard table row
<tr>
  <td>Client Name</td>
  <td>Portfolio Value</td>
  <td>
    <div className="flex justify-center gap-1">
      <EditButton tableContext size="xs" />
      <DeleteButton tableContext size="xs" />
      <LapseButton tableContext size="xs" />
    </div>
  </td>
</tr>

// Compact table row
<tr>
  <td>Data</td>
  <td>
    <div className="flex gap-1">
      <EditButton size="icon" iconOnly />
      <DeleteButton size="icon" iconOnly />
    </div>
  </td>
</tr>
```

### Form Actions
```tsx
// Modal dialog actions
<div className="flex justify-end gap-2">
  <ActionButton variant="cancel" onClick={onCancel} />
  <ActionButton variant="save" onClick={onSave} loading={isSaving} />
</div>

// Full-width primary action
<AddButton 
  context="New Client" 
  design="descriptive" 
  fullWidth 
  size="lg"
  onClick={handleAddClient}
/>
```

### Header Actions
```tsx
// Page header actions
<div className="flex gap-2">
  <AddButton context="Client" design="balanced" />
  <EditButton context="Settings" design="balanced" />
</div>
```

## Performance Considerations

### Optimizations
- Memoized icon components prevent unnecessary re-renders
- Efficient class name generation with minimal string operations
- Lazy loading of icons where applicable
- Minimal DOM footprint

### Bundle Size
- Tree-shakeable exports
- Shared base component reduces duplication
- Icon optimization through Heroicons

## Testing Strategy

### Unit Tests
- Component rendering with all prop combinations
- Event handler execution
- State management (loading, disabled)
- Accessibility attribute verification

### Integration Tests
- Table integration scenarios
- Form submission workflows
- Modal dialog interactions
- Keyboard navigation sequences

### Visual Regression Tests
- All size variations
- All design patterns
- Color contrast verification
- Responsive behavior

## Migration Guide

### From Legacy Buttons
```typescript
// Old approach
<button className="btn btn-primary" onClick={handleEdit}>
  <PencilIcon /> Edit
</button>

// New approach
<EditButton onClick={handleEdit} />
```

### From Custom Action Buttons
```typescript
// Old custom button
<button className="bg-red-500 text-white px-3 py-1 rounded">
  Delete Item
</button>

// New standardized button
<DeleteButton context="Item" design="balanced" />
```

## Future Enhancements

### Planned Features
1. **Confirmation Dialogs**: Built-in confirmation for destructive actions
2. **Keyboard Shortcuts**: Configurable hotkey support
3. **Animation Presets**: Micro-interactions for better UX
4. **Batch Actions**: Multi-select operation support
5. **Custom Icons**: Support for custom icon sets

### Extensibility
- Plugin architecture for custom variants
- Theme customization support
- Custom size definitions
- Advanced accessibility features

## Usage Examples

### Basic Usage
```tsx
import { EditButton, AddButton, DeleteButton } from '@/components/ui';

// Simple usage
<EditButton onClick={handleEdit} />
<AddButton onClick={handleAdd} />
<DeleteButton onClick={handleDelete} />
```

### Advanced Usage
```tsx
// Context-aware with custom styling
<AddButton 
  context="Investment Product"
  design="descriptive"
  size="lg"
  fullWidth
  loading={isCreating}
  disabled={!isValid}
  onClick={handleCreateProduct}
/>

// Table integration
<EditButton 
  tableContext
  size="xs"
  design="minimal"
  onClick={() => handleEdit(row.id)}
/>
```

### Form Integration
```tsx
// Save/Cancel pattern
<div className="flex justify-end gap-2 mt-6">
  <ActionButton 
    variant="cancel" 
    onClick={onCancel}
    disabled={isSubmitting}
  />
  <ActionButton 
    variant="save" 
    onClick={onSave}
    loading={isSubmitting}
  />
</div>
```

## Component Files

### Core Components
- ✅ `ActionButton.tsx` - Base action button component
- ✅ `EditButton.tsx` - Specialized edit button
- ✅ `AddButton.tsx` - Specialized add button  
- ✅ `DeleteButton.tsx` - Specialized delete button
- ✅ `LapseButton.tsx` - Specialized lapse button

### Supporting Files
- ✅ `index.ts` - Component exports
- ✅ `GROUP4_SUMMARY.md` - This documentation

## Integration Status

### Components Page
- ✅ Group 4 section added with comprehensive examples
- ✅ Design pattern demonstrations
- ✅ Size variation showcases
- ✅ Table integration examples
- ✅ Loading and disabled state examples

### Export Configuration
- ✅ All components exported from `index.ts`
- ✅ TypeScript interfaces exported
- ✅ Tree-shakeable imports supported

---

**Group 4 Summary**: 5 components delivered with comprehensive design system integration, full accessibility support, context-aware functionality, and production-ready table integration capabilities. The Action Button Family provides consistent, professional, and highly usable action buttons across the entire Kingstons Portal application. 