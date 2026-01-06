# Archive

**Deprecated Components - Do Not Use**

⚠️ **WARNING**: This directory contains deprecated components that have been superseded by newer implementations. Do not use these components in new code or features.

---

## 🗄️ Purpose

The `_archive/` directory serves as a historical reference for deprecated components. Components are moved here when:
- They have been **replaced** by a better implementation
- They are **no longer used** anywhere in the codebase
- They are **kept for reference** but should not be imported

---

## 📁 Archived Components

### BaseModal.tsx
**Deprecated**: 2024-12
**Replaced By**: `@/components/ui/modals/ModalShell.tsx`
**Reason**: New ModalShell provides better accessibility, consistent styling, and more features

### CreateSpecialRelationshipModal.tsx
**Deprecated**: 2024-12
**Replaced By**:
- `@/components/phase2/special-relationships/CreatePersonalRelationshipModal.tsx`
- `@/components/phase2/special-relationships/CreateProfessionalRelationshipModal.tsx`
**Reason**: Split into separate modals for Personal and Professional relationships to improve UX and reduce complexity

### RelationshipFormFields.tsx
**Deprecated**: 2024-12
**Replaced By**:
- `@/components/phase2/special-relationships/PersonalRelationshipFormFields.tsx`
- `@/components/phase2/special-relationships/ProfessionalRelationshipFormFields.tsx`
**Reason**: Split into type-specific form fields for better validation and clearer UX

### SpecialRelationshipActions.tsx
**Deprecated**: 2024-12
**Replaced By**: Table-level action implementations in PersonalRelationshipsTable and ProfessionalRelationshipsTable
**Reason**: Actions moved into table rows for better UX and consistency with Phase 2 patterns

### SpecialRelationshipRow.tsx
**Deprecated**: 2024-12
**Replaced By**: Table-row implementations in PersonalRelationshipsTable and ProfessionalRelationshipsTable
**Reason**: Row logic integrated directly into tables for better maintainability

### ClientsOptimizationTest.tsx
**Deprecated**: 2024-12
**Replaced By**: N/A (test component)
**Reason**: Test component used for performance benchmarking, no longer needed in production

---

## ⛔ Usage Rules

### ❌ DO NOT
- Import archived components in new code
- Copy patterns from archived components
- Modify archived components
- Use archived components as reference for new features

### ✅ DO
- Use the replacement components listed above
- Refer to Phase 2 components for current patterns
- Delete archived components after 6 months if truly unused

---

## 🔄 Migration Path

If you find code importing an archived component:

### 1. Identify the Replacement
Check the list above for the replacement component.

### 2. Update the Import
```typescript
// OLD (archived)
import CreateSpecialRelationshipModal from '@/components/_archive/CreateSpecialRelationshipModal';

// NEW (current)
import CreatePersonalRelationshipModal from '@/components/phase2/special-relationships/CreatePersonalRelationshipModal';
// or
import CreateProfessionalRelationshipModal from '@/components/phase2/special-relationships/CreateProfessionalRelationshipModal';
```

### 3. Update Usage
The replacement component may have a different API. Check its documentation and update usage accordingly.

### 4. Test
Thoroughly test the updated code to ensure no regressions.

---

## 📅 Retention Policy

Archived components are kept for:
- **6 months** - For reference during migration
- **After 6 months** - Eligible for deletion if:
  - No imports found in codebase
  - No references in tests
  - Migration is complete

---

## 🔍 Finding Archived Component Usage

To find if an archived component is still being used:

```bash
# Search for imports
cd frontend/src
grep -r "from '@/components/_archive/ComponentName'" .

# Search for any reference
grep -r "ComponentName" . --exclude-dir=node_modules
```

---

## 📝 Adding to Archive

When deprecating a component:

### Checklist
1. **Verify replacement exists**
   - Replacement component is fully functional
   - Replacement component is tested
   - Replacement component is documented

2. **Update all imports**
   - Search for all imports of old component
   - Update to use replacement
   - Test thoroughly

3. **Move to archive**
   ```bash
   git mv components/OldComponent.tsx components/_archive/
   ```

4. **Update this README**
   - Add component to the list above
   - Document deprecation date
   - List replacement component
   - Explain reason for deprecation

5. **Update CHANGELOG** (if applicable)
   ```markdown
   ### Deprecated
   - `OldComponent` - Use `NewComponent` instead
   ```

---

## ⏰ Scheduled for Deletion

Components that will be deleted soon (6+ months old, no usage):

| Component | Archived | Delete After | Usage Found |
|-----------|----------|--------------|-------------|
| (None yet) | - | - | - |

Check this list monthly and delete components that are safe to remove.

---

## 📖 Further Reading

- [`../README.md`](../README.md) - Component organization guide
- [`../phase2/README.md`](../phase2/README.md) - Modern component patterns
- [`../../CLAUDE.md`](../../CLAUDE.md) - Project documentation

---

**Last Updated**: 2026-01-06
**Archived Components**: 6
**Status**: 🗄️ Historical Reference Only
