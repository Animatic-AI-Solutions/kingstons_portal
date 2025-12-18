# Remaining Work for Separate Modals Implementation

## Status Summary

### ✅ Completed:
1. **PersonalRelationshipFormFields.tsx** - Created with product owners multi-select
2. **ProfessionalRelationshipFormFields.tsx** - Created with product owners multi-select
3. **Added "Pet" to PERSONAL_RELATIONSHIPS** - Done
4. **Updated SpecialRelationshipFormData type** - Added product_owner_ids field

### ⚠️ In Progress:
1. **Validation for product_owner_ids** - Needs to be added to useRelationshipValidation hook

###  Remaining Tasks:

## 1. Create CreatePersonalRelationshipModal.tsx

**Location**: `frontend/src/components/CreatePersonalRelationshipModal.tsx`

**Key Features**:
- Uses `PersonalRelationshipFormData` type
- Renders `PersonalRelationshipFormFields` component
- Hardcodes `type: 'Personal'` in API payload
- Requires `productOwners` prop to pass to form fields
- Validates that `product_owner_ids` has at least one item

**Props Interface**:
```typescript
export interface CreatePersonalRelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  productOwners: ProductOwner[];  // List of available product owners
  initialProductOwnerIds?: number[];  // Pre-selected product owners
  onSuccess?: (relationship: SpecialRelationship) => void;
}
```

**Form Data Structure**:
```typescript
const [formData, setFormData] = useState<PersonalRelationshipFormData>({
  name: '',
  relationship: '',
  product_owner_ids: initialProductOwnerIds || [],
  status: 'Active',
  date_of_birth: null,
  dependency: false,
  email: null,
  phone_number: null,
  address_id: null,
  notes: null,
});
```

**Validation** (inline):
```typescript
const validateForm = () => {
  const errors: any = {};
  if (!formData.name?.trim()) errors.name = 'Name is required';
  if (!formData.relationship?.trim()) errors.relationship = 'Relationship is required';
  if (!formData.product_owner_ids || formData.product_owner_ids.length === 0) {
    errors.product_owner_ids = 'At least one product owner is required';
  }
  return errors;
};
```

**API Payload**:
```typescript
const prepareCreateData = () => ({
  product_owner_ids: formData.product_owner_ids,
  name: formData.name,
  type: 'Personal',  // HARDCODED
  relationship: formData.relationship,
  status: formData.status,
  ...(formData.date_of_birth && { date_of_birth: formData.date_of_birth }),
  ...(formData.dependency !== undefined && { dependency: formData.dependency }),
  ...(formData.email && { email: formData.email }),
  ...(formData.phone_number && { phone_number: formData.phone_number }),
  ...(formData.address_id && { address_id: formData.address_id }),
  ...(formData.notes && { notes: formData.notes }),
});
```

---

## 2. Create CreateProfessionalRelationshipModal.tsx

**Location**: `frontend/src/components/CreateProfessionalRelationshipModal.tsx`

Same structure as Personal modal but:
- Uses `ProfessionalRelationshipFormData` type
- Renders `ProfessionalRelationshipFormFields` component
- Hardcodes `type: 'Professional'` in API payload
- Includes `firm_name` field
- Does NOT include `date_of_birth` or `dependency` fields
- Status options: Only 'Active' and 'Inactive' (no 'Deceased')

**Form Data Structure**:
```typescript
const [formData, setFormData] = useState<ProfessionalRelationshipFormData>({
  name: '',
  relationship: '',
  product_owner_ids: initialProductOwnerIds || [],
  status: 'Active',
  firm_name: null,
  email: null,
  phone_number: null,
  address_id: null,
  notes: null,
});
```

**API Payload**:
```typescript
const prepareCreateData = () => ({
  product_owner_ids: formData.product_owner_ids,
  name: formData.name,
  type: 'Professional',  // HARDCODED
  relationship: formData.relationship,
  status: formData.status,
  ...(formData.firm_name && { firm_name: formData.firm_name }),
  ...(formData.email && { email: formData.email }),
  ...(formData.phone_number && { phone_number: formData.phone_number }),
  ...(formData.address_id && { address_id: formData.address_id }),
  ...(formData.notes && { notes: formData.notes }),
});
```

---

## 3. Update SpecialRelationshipsSubTab.tsx

**File**: `frontend/src/components/SpecialRelationshipsSubTab.tsx`

**Changes Needed**:

1. **Add Props**:
```typescript
export interface SpecialRelationshipsSubTabProps {
  productOwnerId: number;
  allProductOwners: ProductOwner[];  // ADD THIS - full list for multi-select
}
```

2. **Update Imports**:
```typescript
// REMOVE:
import CreateSpecialRelationshipModal from './CreateSpecialRelationshipModal';

// ADD:
import CreatePersonalRelationshipModal from './CreatePersonalRelationshipModal';
import CreateProfessionalRelationshipModal from './CreateProfessionalRelationshipModal';
```

3. **Update Modal Rendering**:
```typescript
// REMOVE old modal
<CreateSpecialRelationshipModal
  isOpen={showCreateModal}
  onClose={handleCreateModalClose}
  productOwnerIds={[productOwnerId]}
  initialType={initialType}
/>

// REPLACE WITH conditional rendering:
{activeTab === 'personal' ? (
  <CreatePersonalRelationshipModal
    isOpen={showCreateModal}
    onClose={handleCreateModalClose}
    productOwners={allProductOwners}
    initialProductOwnerIds={[productOwnerId]}
  />
) : (
  <CreateProfessionalRelationshipModal
    isOpen={showCreateModal}
    onClose={handleCreateModalClose}
    productOwners={allProductOwners}
    initialProductOwnerIds={[productOwnerId]}
  />
)}
```

4. **Remove initialType state** (no longer needed since we have separate modals)

---

## 4. Update SpecialRelationshipsWrapper.tsx

**File**: `frontend/src/pages/ClientGroupSuite/tabs/components/SpecialRelationshipsWrapper.tsx`

**Changes Needed**:

```typescript
// Pass all product owners to SubTab
<SpecialRelationshipsSubTab
  productOwnerId={primaryProductOwner.id}
  allProductOwners={productOwners}  // ADD THIS
/>
```

---

## 5. Add Validation for product_owner_ids

**File**: `frontend/src/hooks/useRelationshipValidation.ts`

**Changes Needed**:

1. **Add to ValidationErrors interface** (line ~45):
```typescript
export interface ValidationErrors {
  // ... existing fields ...
  product_owner_ids?: string;
}
```

2. **Add error message** (line ~107):
```typescript
export const ERROR_MESSAGES = {
  // ... existing messages ...
  PRODUCT_OWNERS_REQUIRED: 'At least one product owner is required',
} as const;
```

3. **Add validation function** (after other validators):
```typescript
const validateProductOwnerIds = (value: number[] | undefined): string | undefined => {
  if (!value || value.length === 0) {
    return ERROR_MESSAGES.PRODUCT_OWNERS_REQUIRED;
  }
  return undefined;
};
```

4. **Add to validateField switch** (line ~320):
```typescript
switch (field) {
  // ... existing cases ...
  case 'product_owner_ids':
    error = validateProductOwnerIds(value);
    break;
}
```

5. **Add to validateForm** (line ~367):
```typescript
const validateForm = useCallback(
  (data: Partial<RelationshipFormData>): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    // ... existing validations ...

    // Validate product_owner_ids (required)
    if (data.product_owner_ids !== undefined) {
      const error = validateProductOwnerIds(data.product_owner_ids);
      if (error) newErrors.product_owner_ids = error;
    } else {
      newErrors.product_owner_ids = ERROR_MESSAGES.PRODUCT_OWNERS_REQUIRED;
    }

    // ... rest of validations ...
  }
);
```

---

## 6. Update EditSpecialRelationshipModal

**File**: `frontend/src/components/EditSpecialRelationshipModal.tsx`

Similar changes needed:
- Split into `EditPersonalRelationshipModal` and `EditProfessionalRelationshipModal`
- OR update existing modal to accept `productOwners` prop and show multi-select

---

## 7. Delete Old Files (After Testing)

Once new modals are working:
- **CAN DELETE**: `frontend/src/components/CreateSpecialRelationshipModal.tsx`
- **CAN DELETE**: `frontend/src/components/RelationshipFormFields.tsx`
- **UPDATE TESTS**: All modal tests need updating

---

## Implementation Priority

1. **Add validation to useRelationshipValidation.ts** (5 minutes)
2. **Create CreatePersonalRelationshipModal.tsx** (30 minutes)
3. **Create CreateProfessionalRelationshipModal.tsx** (20 minutes - copy/modify)
4. **Update SpecialRelationshipsSubTab.tsx** (10 minutes)
5. **Update SpecialRelationshipsWrapper.tsx** (5 minutes)
6. **Test manually** (20 minutes)
7. **Update tests** (60 minutes)

**Total Estimated Time**: ~2.5 hours

---

## Testing Checklist

- [ ] Can create Personal relationship with at least 1 product owner
- [ ] Can create Personal relationship with multiple product owners
- [ ] Cannot submit Personal form with 0 product owners (shows error)
- [ ] Can create Professional relationship with at least 1 product owner
- [ ] Can create Professional relationship with multiple product owners
- [ ] Cannot submit Professional form with 0 product owners (shows error)
- [ ] Personal modal does NOT show firm_name field
- [ ] Professional modal does NOT show date_of_birth or dependency fields
- [ ] Product owners multi-select shows all product owners from client group
- [ ] Selected product owners are pre-filled when opening modal from specific product owner page
- [ ] Clicking "Add Personal Relationship" opens Personal modal
- [ ] Clicking "Add Professional Relationship" opens Professional modal
- [ ] All existing tests pass
