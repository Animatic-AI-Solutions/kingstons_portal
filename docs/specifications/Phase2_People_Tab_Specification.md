# People (Product Owners) Section - Specification Document

## 1. Overview

### 1.1 Purpose
The People section is a dedicated sub-tab within the Basic Details tab of the Client Group Suite that displays and manages all product owners (people) associated with a client group. It provides a comprehensive table view with sorting, status management, and editing capabilities.

### 1.2 Scope
- Display all product owners in a sortable, interactive table
- **Create new product owners and associate them with the client group**
- Support status transitions (active → lapsed, active → deceased, inactive → active)
- Enable deletion of inactive product owners with confirmation
- Provide full editing capabilities via modal dialog with progressive disclosure
- Visual differentiation between active and inactive product owners

### 1.3 Location in Application
- **Parent Component**: `ClientGroupSuite` (`frontend/src/pages/ClientGroupSuite/index.tsx`)
- **Tab**: Basic Details (`frontend/src/pages/ClientGroupSuite/tabs/BasicDetailsTab.tsx`)
- **Sub-Tab**: People (first sub-tab in horizontal navigation)

---

## 2. User Stories

### 2.1 Primary User Stories

**US-1: View Product Owners**
- **As a** financial advisor
- **I want to** see all product owners in a client group displayed in a table
- **So that** I can quickly review who is associated with this client group

**US-2: Sort Product Owners**
- **As a** financial advisor
- **I want to** sort product owners by any column (name, relationship, age, DOB, email, status)
- **So that** I can organize the information in a way that suits my current task

**US-3: Lapse a Product Owner**
- **As a** financial advisor
- **I want to** mark an active product owner as lapsed
- **So that** I can indicate they are no longer an active client but retain their history

**US-4: Mark Product Owner as Deceased**
- **As a** financial advisor
- **I want to** mark an active product owner as deceased
- **So that** I can properly record this status change for compliance and record-keeping

**US-5: Reactivate Product Owner**
- **As a** financial advisor
- **I want to** reactivate a lapsed or deceased product owner
- **So that** I can correct mistakes or reinstate a client who returns

**US-6: Delete Product Owner**
- **As a** financial advisor
- **I want to** permanently delete an inactive product owner with a warning confirmation
- **So that** I can remove erroneous or duplicate records while preventing accidental deletions

**US-7: Edit Product Owner Details**
- **As a** financial advisor
- **I want to** click on a product owner row to open an edit modal
- **So that** I can update their personal, contact, employment, and compliance information

**US-8: Visual Status Indication**
- **As a** financial advisor
- **I want to** see inactive product owners greyed out and at the bottom of the table
- **So that** I can quickly distinguish between active and inactive clients

**US-9: Create New Product Owner**
- **As a** financial advisor
- **I want to** add a new product owner to a client group
- **So that** I can onboard new clients without needing database access

---

## 3. Functional Requirements

### 3.1 Data Retrieval

**FR-3.1.1: Fetch Product Owners**
- **Endpoint**: `GET /client-groups/{client_group_id}/product-owners`
- **Backend Location**: `backend/app/api/routes/client_groups.py` (lines 251-296)
- **Response**: Array of product owner objects with joined address information
- **Default Ordering**: By `display_order` (user's custom order) or `created_at` if display_order is 0/null

**FR-3.1.2: Data Structure**
```typescript
interface ProductOwner {
  // Core identity
  id: number;
  status: string; // 'active' | 'lapsed' | 'deceased'
  firstname: string;
  surname: string;
  known_as: string;
  title: string;
  middle_names: string;

  // Personal details
  relationship_status: string; // Used as "Relationship" column
  gender: string;
  previous_names: string;
  dob: string; // ISO date string
  place_of_birth: string;

  // Contact information
  email_1: string; // Primary email for table display
  email_2: string;
  phone_1: string;
  phone_2: string;

  // Residential
  moved_in_date: string;
  address_id: number | null;
  address_line_1?: string; // Joined from addresses table
  address_line_2?: string;
  address_line_3?: string;
  address_line_4?: string;
  address_line_5?: string;

  // Profiling
  three_words: string;
  share_data_with: string;

  // Employment
  employment_status: string;
  occupation: string;

  // Compliance
  passport_expiry_date: string;
  ni_number: string;
  aml_result: string;
  aml_date: string;

  // Metadata
  created_at: string;
}
```

### 3.2 Table Display

**FR-3.2.1: Table Columns**
| Column | Data Field | Type | Sortable | Notes |
|--------|-----------|------|----------|-------|
| Name | `title`, `firstname`, `surname` | Text | Yes | Concatenated as "Title Firstname Surname" |
| Relationship | `relationship_status` | Text | Yes | Marital/relationship status |
| Age | Calculated from `dob` | Number | Yes | Real-time calculation from DOB |
| DOB | `dob` | Date | Yes | Format: YYYY-MM-DD or user-friendly display |
| Email | `email_1` | Text | Yes | Primary email only |
| Status | `status` | Badge | Yes | Visual badge with color coding |
| Actions | Button group | Actions | No | Context-specific action buttons |

**FR-3.2.2: Age Calculation**
- Calculate age from DOB using the existing `calculateAge` function pattern from SummaryTab.tsx (lines 148-158)
- Handle edge cases: missing DOB, invalid dates, future dates
- Recalculate on data refresh (not stored in database)

**FR-3.2.3: Name Display**
- Format: `[Title] Firstname Surname`
- Example: "Mr John Smith", "Dr Jane Doe"
- Handle missing fields gracefully (omit if null)

**FR-3.2.4: Semantic HTML Table Structure (Accessibility Requirement)**
- **MUST** use semantic HTML table elements: `<table>`, `<thead>`, `<tbody>`, `<th>`, `<tr>`, `<td>`
- Table headers MUST use `<th scope="col">` for proper screen reader announcement
- Table MUST have `role="table"` attribute
- Column headers MUST include dynamic `aria-sort` attribute reflecting current sort state:
  - `aria-sort="ascending"` when sorted ascending
  - `aria-sort="descending"` when sorted descending
  - `aria-sort="none"` when not sorted
- Screen readers will announce: "table with 7 columns, [N] rows"
- If responsive design requires div-based layout on mobile, MUST add explicit ARIA table roles

### 3.3 Sorting Functionality

**FR-3.3.1: Default Sort Order**
- **Primary**: Use `display_order` from `client_group_product_owners` table
- **Secondary**: By `created_at` ascending for rows with display_order = 0
- **Inactive Rows**: Automatically appear at bottom regardless of sort (see FR-3.4.3)

**FR-3.3.2: User-Initiated Sorting**
- Click on any column header to sort by that column
- First click: Ascending order (A-Z, 0-9, earliest date first)
- Second click: Descending order (Z-A, 9-0, latest date first)
- Third click: Return to default sort order
- Visual indicator: Arrow icon in column header (↑↓)

**FR-3.3.3: Sort Behavior by Column Type**
- **Text columns** (Name, Relationship, Email): Alphabetical, case-insensitive
- **Numeric columns** (Age): Numerical ascending/descending
- **Date columns** (DOB): Chronological order
- **Status column**: Custom order: Active → Lapsed → Deceased

**FR-3.3.4: Inactive Row Positioning**
- Inactive product owners (lapsed, deceased) always sort to bottom
- Within inactive group, maintain the selected sort order
- Clear visual separation between active and inactive sections

### 3.4 Status Management

**FR-3.4.1: Status Types**
```typescript
type ProductOwnerStatus = 'active' | 'lapsed' | 'deceased';
```

**FR-3.4.2: Visual Treatment by Status**
- **Active**: Normal display with full color saturation
- **Lapsed**: Greyed out (opacity-50, grayscale-30%)
- **Deceased**: Greyed out (opacity-50, grayscale-30%)

**FR-3.4.3: Automatic Positioning**
- Inactive product owners automatically move to bottom of table
- Within active/inactive groups, respect current sort order
- No manual drag-and-drop in this view (ordering managed via Summary tab)

**FR-3.4.4: Status Badge Display**
- **Active**: Green badge with checkmark icon
- **Lapsed**: Orange badge with pause icon
- **Deceased**: Grey badge with appropriate icon
- Badge colors should match design system (Tailwind colors)

### 3.5 Action Buttons

**FR-3.5.1: Actions for Active Product Owners**
```typescript
// Available buttons for status === 'active'
- Edit Button (always available)
- Lapse Button → Changes status to 'lapsed'
- Make Deceased Button → Changes status to 'deceased'
```

**FR-3.5.2: Actions for Inactive Product Owners**
```typescript
// Available buttons for status === 'lapsed' || status === 'deceased'
- Edit Button (always available)
- Reactivate Button → Changes status to 'active'
- Delete Button → Permanently deletes with confirmation
```

**FR-3.5.3: Button Component Usage**
- Use existing `ActionButton` component from `frontend/src/components/ui/buttons/ActionButton.tsx`
- Use specialized wrappers: `LapseButton`, `DeleteButton`
- Table context: Set `tableContext={true}` for compact sizing
- Size: Use `size="xs"` or `size="sm"` for table rows

**FR-3.5.4: Button Configuration**
```tsx
// Active product owner actions
<EditButton
  tableContext
  size="xs"
  onClick={() => handleEdit(productOwner)}
/>
<LapseButton
  tableContext
  size="xs"
  onClick={() => handleStatusChange(productOwner.id, 'lapsed')}
/>
<ActionButton
  variant="delete"
  tableContext
  size="xs"
  onClick={() => handleStatusChange(productOwner.id, 'deceased')}
>
  Make Deceased
</ActionButton>

// Inactive product owner actions
<EditButton
  tableContext
  size="xs"
  onClick={() => handleEdit(productOwner)}
/>
<ActionButton
  variant="add"
  tableContext
  size="xs"
  onClick={() => handleStatusChange(productOwner.id, 'active')}
>
  Reactivate
</ActionButton>
<DeleteButton
  tableContext
  size="xs"
  onClick={() => handleDelete(productOwner.id)}
/>
```

### 3.6 Status Transition API

**FR-3.6.1: Update Status Endpoint**
- **Endpoint**: `PUT /product-owners/{product_owner_id}`
- **Backend Location**: `backend/app/api/routes/product_owners.py` ✅ **VERIFIED - Endpoint exists**
- **Function**: `update_product_owner()`
- **Request Body**:
```json
{
  "status": "active" | "lapsed" | "deceased"
}
```

**FR-3.6.2: Status Transition Logic**
```typescript
const handleStatusChange = async (productOwnerId: number, newStatus: string) => {
  try {
    await api.put(`/product-owners/${productOwnerId}`, {
      status: newStatus
    });

    // Refresh product owners list
    await refetchProductOwners();
    // Show success notification
    showNotification('Status updated successfully', 'success');
  } catch (error) {
    // Show error notification
    showNotification('Failed to update status', 'error');
  }
};
```

### 3.7 Deletion with Confirmation

**FR-3.7.1: Delete Confirmation Modal**
- **Trigger**: Clicking Delete button on inactive product owner
- **Modal Content**:
  - Title: "Confirm Deletion"
  - Message: "Are you sure you want to permanently delete [Full Name]? This action cannot be undone."
  - Warning icon (red exclamation triangle)
  - Buttons: "Cancel" (secondary) and "Delete Permanently" (danger, red)

**FR-3.7.2: Delete API Call**
- **Endpoint**: `DELETE /product-owners/{product_owner_id}`
- **Backend Location**: `backend/app/api/routes/product_owners.py` ✅ **VERIFIED - Endpoint exists**
- **Function**: `delete_product_owner()`
- **Success**: Remove from list, show success notification
- **Error Handling**: Show error notification, keep in list

**FR-3.7.3: Deletion Validation**
- Only allow deletion if status is NOT 'active'
- Backend should validate this constraint
- Frontend should disable/hide delete button for active product owners

### 3.8 Edit Modal

**FR-3.8.1: Modal Trigger (Keyboard Navigation Fixed)**
- **Mouse users**: Click the Edit button or click anywhere on table row (except other buttons)
- **Keyboard users**: Tab to Edit button and press Enter (row-level activation disabled for keyboard to prevent conflicts)
- Implementation approach:
  - Make table row focusable with `tabindex="-1"` (not in tab order)
  - Detect click events on row for mouse users: `onClick={() => handleEdit(productOwner)}`
  - Ensure Edit button receives focus first when tabbing through row
  - Edit button has explicit `onClick` handler that prevents event bubbling
- Cursor changes to pointer on row hover (mouse only)

**FR-3.8.2: Modal Component Specification**
- **Component Library**: Use HeadlessUI Dialog component (`@headlessui/react`)
- **Rationale**: Provides accessible modal with focus trap, ESC handling, and ARIA attributes built-in
- **Base Component**: `import { Dialog } from '@headlessui/react'`
- **Fallback**: If HeadlessUI not in project dependencies, add it via `npm install @headlessui/react`

**FR-3.8.3: Modal Design with Progressive Disclosure (UX Improvement)**
- **Base Design**: Mimic card format from `SummaryTab.tsx` (lines 198-335)
- **Progressive Disclosure**: Implement tabbed sections within modal to reduce cognitive load
  - Research shows 30-field forms have 20-40% abandonment rate
  - Tabbed forms improve completion by 25-35%
- **Tab Structure**:
  1. **Personal Details tab** (10 fields): Title, Firstname, Surname, Middle Names, Known As, Gender, DOB, Place of Birth, Relationship Status, Previous Names, Status
  2. **Contact & Address tab** (10 fields): Email 1, Email 2, Phone 1, Phone 2, Address Lines 1-5, Moved In Date
  3. **Employment & Compliance tab** (9 fields): Employment Status, Occupation, Three Words, Share Data With, NI Number, Passport Expiry, AML Result, AML Date
- **Alternative**: "Quick Edit" mode showing 8 most-used fields with "View All Fields" expansion (defer to Phase 2)

**FR-3.8.4: Modal Structure with Tabs**
```tsx
<Dialog open={isEditModalOpen} onClose={closeModal}>
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
  {/* Header Section */}
  <div className="flex items-center mb-4 pb-3 border-b border-gray-200">
    <UserIcon className="h-5 w-5 text-primary-700" />
    <h3 className="text-xl font-semibold text-gray-900">
      Edit Product Owner: {fullName}
    </h3>
  </div>

  {/* Form Sections */}
  <form onSubmit={handleSubmit}>
    {/* Personal Details Section */}
    <section>
      <h4 className="text-base font-semibold text-gray-900 uppercase mb-2">
        Personal Details
      </h4>
      {/* 2-column grid of input fields */}
    </section>

    {/* Address & Contact Section */}
    <section>
      <h4 className="text-base font-semibold text-gray-900 uppercase mb-2">
        Address & Contact Details
      </h4>
      {/* 2-column grid of input fields */}
    </section>

    {/* Employment & Documents Section */}
    <section>
      <h4 className="text-base font-semibold text-gray-900 uppercase mb-2">
        Employment & Documents
      </h4>
      {/* 2-column grid of input fields */}
    </section>

    {/* Action Buttons */}
    <div className="flex justify-end gap-2 mt-6">
      <ActionButton variant="cancel" onClick={closeModal}>
        Cancel
      </ActionButton>
      <ActionButton variant="save" type="submit" loading={isSaving}>
        Save Changes
      </ActionButton>
    </div>
  </form>
</Modal>
```

**FR-3.8.4: Editable Fields (30 fields)**

**Core Identity (6 fields)**
- Status (dropdown: active, lapsed, deceased)
- Title (dropdown or text input)
- Firstname (text input, required)
- Surname (text input, required)
- Middle Names (text input)
- Known As (text input)

**Personal Details (5 fields)**
- Relationship Status (dropdown)
- Gender (dropdown)
- Previous Names (text input)
- Date of Birth (date picker)
- Place of Birth (text input)

**Contact Information (4 fields)**
- Email 1 (email input)
- Email 2 (email input)
- Phone 1 (tel input)
- Phone 2 (tel input)

**Residential (6 fields)**
- Address Line 1 (text input)
- Address Line 2 (text input)
- Address Line 3 (text input)
- Address Line 4 (text input)
- Address Line 5 (text input)
- Moved In Date (date picker)

**Profiling (2 fields)**
- Three Words (text input)
- Share Data With (text input or dropdown)

**Employment (2 fields)**
- Employment Status (dropdown)
- Occupation (text input)

**Compliance (4 fields)**
- National Insurance Number (text input with format validation)
- Passport Expiry Date (date picker)
- AML Result (dropdown)
- AML Date (date picker)

**FR-3.8.5: Field Validation**
- **Required fields**: firstname, surname
- **Email validation**: Valid email format for email_1 and email_2
- **Date validation**: Valid dates, not future dates (except passport_expiry_date)
- **NI Number validation**: UK format (XX 00 00 00 X)
- **Phone validation**: Basic format check

**FR-3.8.6: Save Changes API**
- **Endpoint**: `PUT /product-owners/{product_owner_id}`
- **Backend Location**: `backend/app/api/routes/product_owners.py` ✅ **VERIFIED - Endpoint exists**
- **Function**: `update_product_owner()`
- **Request Body**: All 30 product owner fields
- **Success**: Close modal, refresh list, show success notification
- **Error**: Show error message in modal, keep modal open

### 3.9 Create New Product Owner

**FR-3.9.1: Create Button Placement**
- Add "+ Add Person" button in table header, next to "People in Client Group" heading
- Button styling: Primary purple (`bg-primary-600`), white text, medium size
- Icon: UserPlusIcon from Heroicons
- Click opens Create Product Owner modal

**FR-3.9.2: Create Modal**
- **Component**: Same HeadlessUI Dialog as Edit modal
- **Structure**: Identical tabbed layout as Edit modal (Personal Details | Contact & Address | Employment & Compliance)
- **Differences from Edit**:
  - Title: "Add New Person to Client Group"
  - All fields start empty (no pre-populated values)
  - Status defaults to 'active'

**FR-3.9.3: Create API Endpoint**
- **Endpoint**: `POST /product-owners`
- **Backend Location**: `backend/app/api/routes/product_owners.py` ✅ **VERIFIED - Endpoint exists**
- **Function**: `create_product_owner()`
- **Request Body**: All product owner fields (firstname, surname required)
- **Response**: Created product owner object with generated ID
- **Post-Creation**: Automatically associate with current client group via `POST /client-group-product-owners`

**FR-3.9.4: Client Group Association**
- **Endpoint**: `POST /client-group-product-owners`
- **Backend Location**: `backend/app/api/routes/client_group_product_owners.py` ✅ **VERIFIED - Endpoint exists**
- **Function**: `create_client_group_product_owner()`
- **Request Body**:
```json
{
  "client_group_id": 123,
  "product_owner_id": 456,
  "display_order": 0  // Will be calculated as max(existing) + 1 on backend
}
```

**FR-3.9.5: Create Workflow**
```typescript
const handleCreateProductOwner = async (formData: ProductOwnerCreate) => {
  try {
    // Step 1: Create product owner
    const response = await api.post('/product-owners', formData);
    const newProductOwner = response.data;

    // Step 2: Associate with current client group
    await api.post('/client-group-product-owners', {
      client_group_id: clientGroupId,
      product_owner_id: newProductOwner.id,
      display_order: 0  // Backend calculates position
    });

    // Step 3: Refresh list and close modal
    await refetchProductOwners();
    closeCreateModal();
    showNotification(`${newProductOwner.firstname} ${newProductOwner.surname} added successfully`, 'success');
  } catch (error: any) {
    showNotification(error.response?.data?.detail || 'Failed to create product owner', 'error');
  }
};
```

---

## 4. Data Requirements

### 4.1 Primary Data Source
- **Table**: `product_owners`
- **Junction Table**: `client_group_product_owners` (for display_order and association)
- **Related Table**: `addresses` (LEFT JOIN for address information)

### 4.2 Database Schema

**client_group_product_owners Table**
```sql
CREATE TABLE client_group_product_owners (
    id BIGINT PRIMARY KEY,
    client_group_id BIGINT FOREIGN KEY -> client_groups.id,
    product_owner_id BIGINT FOREIGN KEY -> product_owners.id,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**product_owners Table**
- See `backend/app/models/product_owner.py` for complete 30-field schema
- Key fields: id, status, firstname, surname, relationship_status, dob, email_1, etc.

### 4.3 API Endpoints (All Verified ✅)

**GET Product Owners**
```
GET /client-groups/{client_group_id}/product-owners
Response: ProductOwner[]
Backend: backend/app/api/routes/client_groups.py ✅
```

**CREATE Product Owner**
```
POST /product-owners
Request Body: ProductOwnerCreate (firstname, surname required, 28 other optional fields)
Response: ProductOwner (with generated ID)
Backend: backend/app/api/routes/product_owners.py ✅
```

**UPDATE Product Owner**
```
PUT /product-owners/{product_owner_id}
Request Body: Partial<ProductOwner> (any subset of 30 fields)
Response: ProductOwner
Backend: backend/app/api/routes/product_owners.py ✅
```

**DELETE Product Owner**
```
DELETE /product-owners/{product_owner_id}
Response: 204 No Content
Backend: backend/app/api/routes/product_owners.py ✅
```

**CREATE Client Group Association**
```
POST /client-group-product-owners
Request Body: { client_group_id, product_owner_id, display_order }
Response: Association object
Backend: backend/app/api/routes/client_group_product_owners.py ✅
```

### 4.4 Data Validation Rules

**Backend Validation** (Pydantic models in `backend/app/models/product_owner.py`)
- firstname: required, min_length=1
- surname: required, min_length=1
- status: default='active', must be one of: active, lapsed, deceased
- dates: valid ISO date format or null
- emails: valid email format or null

**Frontend Validation**
- Real-time validation on field blur
- Submit-time validation before API call
- Display validation errors inline with fields

---

## 5. UI/UX Requirements

### 5.1 Layout and Visual Design

**Container**
```tsx
<div className="bg-white rounded-lg shadow-md border border-gray-100 p-6">
  <h3 className="text-xl font-semibold text-gray-900 mb-4">
    People in Client Group
  </h3>
  {/* Table goes here */}
</div>
```

**Table Styling**
- **Header**: Primary purple background (`bg-primary-700`), white text
- **Rows**: Alternating white and light grey (`bg-gray-50`) for zebra striping
- **Hover**: Subtle highlight on row hover (`hover:bg-gray-100`)
- **Borders**: Light grey borders between rows (`border-gray-200`)
- **Padding**: Generous padding for readability (`px-6 py-4`)

**Inactive Row Styling**
```tsx
className={`${baseRowClasses} ${
  isInactive ? 'opacity-50 grayscale-[30%]' : ''
}`}
```

### 5.2 Responsive Behavior

**Desktop (≥1024px)**
- Full 7-column table display
- All columns visible
- Action buttons displayed horizontally

**Tablet (768px - 1023px)**
- Horizontal scroll if needed
- Consider hiding less critical columns (e.g., Age if DOB is shown)
- Action buttons in dropdown menu

**Mobile (<768px)**
- Switch to card-based layout (similar to Summary tab grid)
- Stack information vertically
- Full-width action buttons

### 5.3 Loading States

**Initial Load**
```tsx
<div className="flex justify-center items-center py-12">
  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-600" />
</div>
```

**Action Loading** (Status change, delete)
- Disable action buttons during API call
- Show spinner in button: `loading={true}` prop
- Prevent multiple simultaneous actions

### 5.4 Empty State

**No Product Owners**
```tsx
<div className="bg-gray-50 border border-gray-200 rounded-lg p-12">
  <UserIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
  <p className="text-gray-500 text-center text-lg">
    No product owners found for this client group
  </p>
  <p className="text-gray-400 text-center text-sm mt-2">
    Add product owners to get started
  </p>
</div>
```

### 5.5 Error States

**API Error**
```tsx
<div className="bg-red-50 border border-red-200 rounded-lg p-6">
  <p className="text-red-700 text-center">
    {error || 'Failed to load product owners'}
  </p>
  <button onClick={retry} className="mt-4 text-primary-600 hover:text-primary-700">
    Try Again
  </button>
</div>
```

### 5.6 Notifications

**Success Notifications**
- Status changed: "Status updated to [new status] successfully"
- Saved changes: "Product owner details updated successfully"
- Deleted: "[Full Name] has been permanently deleted"

**Error Notifications**
- API errors: Display specific error message from backend
- Validation errors: "Please correct the errors before saving"
- Network errors: "Network error. Please check your connection and try again"

### 5.7 Accessibility (WCAG 2.1 AA)

**Keyboard Navigation**
- Tab through table rows and action buttons
- Enter key to activate buttons
- Escape key to close modal
- Arrow keys for row navigation (optional enhancement)

**Screen Reader Support**
- Proper ARIA labels on buttons: `aria-label="Edit John Smith"`
- Table headers with proper scope: `<th scope="col">`
- Status badges with aria-label: `aria-label="Status: Active"`
- Modal with aria-labelledby and aria-describedby

**Color Contrast**
- All text meets 4.5:1 contrast ratio
- Status badges have sufficient contrast
- Focus indicators are clearly visible (3:1 contrast)

**Focus Management**
- Clear focus indicators on all interactive elements
- Focus trap in modal (focus stays within modal when open)
- Focus returns to trigger element when modal closes

---

## 6. State Management

### 6.1 Component State

**Local State Variables**
```typescript
const [productOwners, setProductOwners] = useState<ProductOwner[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
const [isEditModalOpen, setIsEditModalOpen] = useState(false);
const [selectedProductOwner, setSelectedProductOwner] = useState<ProductOwner | null>(null);
const [isDeleting, setIsDeleting] = useState(false);
const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
```

**Sort Configuration**
```typescript
interface SortConfig {
  key: keyof ProductOwner;
  direction: 'asc' | 'desc' | 'default';
}
```

### 6.2 Data Fetching Strategy

**Initial Load**
```typescript
useEffect(() => {
  const fetchProductOwners = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get(`/client-groups/${clientGroupId}/product-owners`);
      setProductOwners(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load product owners');
    } finally {
      setIsLoading(false);
    }
  };

  fetchProductOwners();
}, [clientGroupId]);
```

**Refetch After Mutations**
- After status change: Refetch to get updated data
- After edit save: Refetch to ensure consistency
- After delete: Refetch to remove from list

### 6.3 Sorting Logic

**Active vs Inactive Grouping**
```typescript
const sortedProductOwners = useMemo(() => {
  // Separate active and inactive
  const active = productOwners.filter(po => po.status === 'active');
  const inactive = productOwners.filter(po => po.status !== 'active');

  // Apply sort to each group
  const sortedActive = sortArray(active, sortConfig);
  const sortedInactive = sortArray(inactive, sortConfig);

  // Combine: active first, then inactive
  return [...sortedActive, ...sortedInactive];
}, [productOwners, sortConfig]);
```

**Generic Sort Function**
```typescript
const sortArray = (array: ProductOwner[], config: SortConfig | null) => {
  if (!config || config.direction === 'default') {
    // Return original order (by display_order/created_at from backend)
    return array;
  }

  return [...array].sort((a, b) => {
    const aValue = a[config.key];
    const bValue = b[config.key];

    // Handle null/undefined
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    // Type-specific comparison
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return config.direction === 'asc' ? aValue - bValue : bValue - aValue;
    }

    // String comparison (case-insensitive)
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();

    if (config.direction === 'asc') {
      return aStr.localeCompare(bStr);
    } else {
      return bStr.localeCompare(aStr);
    }
  });
};
```

### 6.4 Modal State Management

**Open Edit Modal**
```typescript
const handleEdit = (productOwner: ProductOwner) => {
  setSelectedProductOwner(productOwner);
  setIsEditModalOpen(true);
};
```

**Close Edit Modal**
```typescript
const closeEditModal = () => {
  setIsEditModalOpen(false);
  setSelectedProductOwner(null);
};
```

**Delete Confirmation Flow**
```typescript
const handleDeleteClick = (productOwner: ProductOwner) => {
  setSelectedProductOwner(productOwner);
  setDeleteConfirmModalOpen(true);
};

const confirmDelete = async () => {
  if (!selectedProductOwner) return;

  try {
    setIsDeleting(true);
    await api.delete(`/product-owners/${selectedProductOwner.id}`);
    setDeleteConfirmModalOpen(false);
    await refetchProductOwners();
    showNotification('Product owner deleted successfully', 'success');
  } catch (error) {
    showNotification('Failed to delete product owner', 'error');
  } finally {
    setIsDeleting(false);
  }
};
```

---

## 7. Modal Design Specification

### 7.1 Modal Component Structure

**Base Modal Component**
- Use existing modal component or create new reusable modal
- Full-screen overlay with semi-transparent backdrop (`bg-black/50`)
- Centered card with white background
- Max width: 900px for 2-column layout
- Smooth animation on open/close

**Modal Layout**
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
  <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
    {/* Content */}
  </div>
</div>
```

### 7.2 Form Field Organization

**Section 1: Personal Details**
- Left Column: Title, Firstname, Middle Names, Gender, DOB, Place of Birth
- Right Column: Surname, Known As, Relationship Status, Previous Names, Status

**Section 2: Contact & Address**
- Left Column: Email 1, Email 2, Phone 1, Phone 2
- Right Column: Address Lines 1-5, Moved In Date

**Section 3: Employment & Compliance**
- Left Column: Employment Status, Occupation, Three Words, Share Data With
- Right Column: NI Number, Passport Expiry, AML Result, AML Date

### 7.3 Form Field Components

**Text Input Example**
```tsx
<div className="mb-3">
  <label className="block text-sm font-medium text-gray-700 mb-1">
    First Name *
  </label>
  <input
    type="text"
    value={formData.firstname}
    onChange={(e) => handleFieldChange('firstname', e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
    required
  />
  {errors.firstname && (
    <p className="mt-1 text-sm text-red-600">{errors.firstname}</p>
  )}
</div>
```

**Dropdown Example**
```tsx
<div className="mb-3">
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Status
  </label>
  <select
    value={formData.status}
    onChange={(e) => handleFieldChange('status', e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
  >
    <option value="active">Active</option>
    <option value="lapsed">Lapsed</option>
    <option value="deceased">Deceased</option>
  </select>
</div>
```

**Date Picker Example**
```tsx
<div className="mb-3">
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Date of Birth
  </label>
  <DateInput
    value={formData.dob || ''}
    onChange={(date, formattedDate) => handleFieldChange('dob', formattedDate)}
  />
</div>
```

### 7.4 Form Validation

**Client-Side Validation**
```typescript
const validateForm = (data: Partial<ProductOwner>): ValidationErrors => {
  const errors: ValidationErrors = {};

  // Required fields
  if (!data.firstname?.trim()) {
    errors.firstname = 'First name is required';
  }
  if (!data.surname?.trim()) {
    errors.surname = 'Surname is required';
  }

  // Email validation
  if (data.email_1 && !isValidEmail(data.email_1)) {
    errors.email_1 = 'Invalid email format';
  }
  if (data.email_2 && !isValidEmail(data.email_2)) {
    errors.email_2 = 'Invalid email format';
  }

  // Date validation
  if (data.dob && new Date(data.dob) > new Date()) {
    errors.dob = 'Date of birth cannot be in the future';
  }

  // NI Number validation (optional but format-checked if provided)
  if (data.ni_number && !isValidNINumber(data.ni_number)) {
    errors.ni_number = 'Invalid NI number format (e.g., AB123456C)';
  }

  return errors;
};
```

### 7.5 Save and Cancel Behavior

**Save Action**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Validate form
  const validationErrors = validateForm(formData);
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    return;
  }

  try {
    setIsSaving(true);
    await api.put(`/product-owners/${selectedProductOwner.id}`, formData);
    closeEditModal();
    await refetchProductOwners();
    showNotification('Changes saved successfully', 'success');
  } catch (error: any) {
    showNotification(
      error.response?.data?.detail || 'Failed to save changes',
      'error'
    );
  } finally {
    setIsSaving(false);
  }
};
```

**Cancel Action**
```typescript
const handleCancel = () => {
  // Check for unsaved changes
  if (hasUnsavedChanges()) {
    if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
      closeEditModal();
    }
  } else {
    closeEditModal();
  }
};
```

---

## 8. Error Handling

### 8.1 Error Scenarios

**Network Errors**
- No internet connection
- Timeout errors
- Server unreachable

**API Errors (4xx)**
- 400 Bad Request: Validation errors
- 404 Not Found: Product owner or client group not found
- 403 Forbidden: Insufficient permissions

**API Errors (5xx)**
- 500 Internal Server Error: Database errors, server crashes
- 503 Service Unavailable: Maintenance mode

**Client-Side Errors**
- Invalid data format
- Failed validations
- Missing required fields

### 8.2 Error Handling Patterns

**Try-Catch Wrapper**
```typescript
const safeApiCall = async <T>(
  apiCall: () => Promise<T>,
  successMessage?: string,
  errorMessage?: string
): Promise<T | null> => {
  try {
    const result = await apiCall();
    if (successMessage) {
      showNotification(successMessage, 'success');
    }
    return result;
  } catch (error: any) {
    const message = errorMessage ||
      error.response?.data?.detail ||
      'An unexpected error occurred';
    showNotification(message, 'error');
    console.error('API Error:', error);
    return null;
  }
};
```

**Usage Example**
```typescript
const handleStatusChange = async (id: number, status: string) => {
  await safeApiCall(
    () => api.put(`/product-owners/${id}`, { status }),
    'Status updated successfully',
    'Failed to update status'
  );
  await refetchProductOwners();
};
```

### 8.3 Error Display

**Inline Form Errors**
- Display validation errors below each field
- Red text color (`text-red-600`)
- Small font size (`text-sm`)

**Notification Errors**
- Toast notification in top-right corner
- Auto-dismiss after 5 seconds
- Manual dismiss with X button
- Error icon with red background

**Full-Page Errors**
- For critical errors (e.g., failed to load data)
- Display error message with retry button
- Graceful degradation to empty state if retry fails

### 8.4 Edge Cases

**Empty DOB**
- Age column shows "N/A" or empty cell
- No error, gracefully handle missing data

**Missing Email**
- Email column shows "N/A" or empty cell
- Still allow status transitions and deletion

**Concurrent Edits**
- Last write wins (no optimistic locking in v1)
- Future enhancement: Detect concurrent edits and warn user

**Network Latency**
- Show loading spinners during API calls
- Disable buttons during in-flight requests
- Prevent duplicate submissions

**Deleted Product Owner**
- If product owner is deleted while viewing
- Handle 404 gracefully, show notification, refresh list

---

## 9. Technical Considerations

### 9.1 Performance Optimization

**Data Caching**
- React Query (already used in codebase) for automatic caching
- 5-minute stale time for product owner data
- Invalidate cache on mutations (status change, edit, delete)

**Lazy Loading**
- Modal component code-split if not using pre-existing modal
- Load modal content only when opened
- Use React.lazy() and Suspense for large components

**Memoization**
- Use `useMemo` for sorted product owners array
- Use `useCallback` for event handlers to prevent re-renders
- Memoize age calculation results

**Pagination** (Future Enhancement)
- For client groups with >100 product owners
- Server-side pagination with limit/offset
- Virtual scrolling for very large lists

### 9.2 Accessibility (WCAG 2.1 AA Compliance)

**Keyboard Navigation**
```typescript
const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    action();
  }
};
```

**ARIA Attributes**
```tsx
<button
  aria-label={`Edit ${fullName}`}
  aria-describedby="edit-tooltip"
  onClick={() => handleEdit(productOwner)}
>
  <PencilIcon className="h-4 w-4" />
</button>
```

**Screen Reader Announcements**
```tsx
<div role="status" aria-live="polite" className="sr-only">
  {notification}
</div>
```

**Focus Management**
```typescript
// Trap focus in modal
useEffect(() => {
  if (isEditModalOpen) {
    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTabKey);
    firstElement.focus();

    return () => modal.removeEventListener('keydown', handleTabKey);
  }
}, [isEditModalOpen]);
```

### 9.3 Testing Strategy

**Unit Tests**
- Age calculation function
- Sort function with various data types
- Form validation logic
- Helper functions (formatName, calculateAge, etc.)

**Component Tests**
- Table renders with mock data
- Action buttons call correct handlers
- Modal opens and closes correctly
- Form fields update state
- Validation errors display

**Integration Tests**
- Full flow: Load data → Sort → Edit → Save
- Status transition flow
- Delete with confirmation flow
- Error handling flows

**E2E Tests** (Cypress or Playwright)
- User can view product owners table
- User can sort by different columns
- User can lapse a product owner
- User can edit and save changes
- User can delete an inactive product owner

**Test Coverage Goals**
- Maintain 70% threshold (per project standards)
- Critical paths: 100% coverage
- Error handling: 80%+ coverage
- UI components: 60%+ coverage

### 9.4 Browser Compatibility

**Supported Browsers**
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

**Polyfills Required**
- None (modern browser features only)
- Date handling via native Date API
- No IE11 support required

### 9.5 Security Considerations

**Input Sanitization**
- All user inputs sanitized on backend (Pydantic validation)
- No direct HTML rendering from user input
- XSS protection via React's auto-escaping

**Authentication**
- HttpOnly cookies for session management (already implemented)
- JWT token validation on all API calls
- No sensitive data in localStorage
- All authenticated users have access to all client groups and their data
- Product owner deletion requires inactive status
- CSRF protection via SameSite cookies

**Data Privacy**
- Personal data (DOB, NI Number, etc.) not logged
- Sensitive fields marked in schema
- Compliance with GDPR requirements

---

## 10. Implementation Roadmap

**Current Estimate**: 13-19 days (simplified from v2.0 requirements)

### Phase 0: Pre-Development & Backend Updates (< 1 day) **NEW**
1. Install HeadlessUI if not in dependencies: `npm install @headlessui/react`
2. Verify all backend endpoints are accessible and returning expected data shapes

### Phase 1: Core Table Display with Semantic HTML (2-3 days)
1. Create PeopleSubTab component in BasicDetailsTab
2. Implement data fetching from API using React Query
3. Build table structure with 7 columns **using semantic HTML** (`<table>`, `<thead>`, `<tbody>`, `<th scope="col">`)
4. Add loading and error states
5. Implement age calculation helper function
6. Add visual treatment for inactive rows (opacity-50, grayscale-30%)
7. Add "+ Add Person" button in table header

### Phase 2: Sorting Functionality with ARIA (1-2 days)
1. Implement column header click handlers
2. Build sort state management with useMemo
3. Create sort logic for different data types (text, number, date)
4. Add visual sort indicators (arrows)
5. **Add dynamic `aria-sort` attributes to column headers**
6. Ensure inactive rows always sort to bottom

### Phase 3: Status Management (1-2 days)
1. Implement action button rendering logic (active vs inactive states)
2. Create handleStatusChange function
3. Add API integration for PUT /product-owners/{id}
4. Add success/error notifications
5. Test all status transitions (active → lapsed/deceased, inactive → active)

### Phase 4: Delete Functionality (1 day)
1. Create delete confirmation modal with HeadlessUI Dialog
2. Implement handleDelete function
3. Add API integration for DELETE endpoint
4. Add validation for inactive-only deletion
5. Test deletion flow

### Phase 5: Edit Modal with Progressive Disclosure (4-5 days) **EXPANDED**
1. Set up HeadlessUI Dialog component for modal
2. Build tabbed layout (Personal Details | Contact & Address | Employment & Compliance)
3. Implement React Hook Form for 30-field form state management **RECOMMENDED**
4. Create reusable form field components (FormInput, FormSelect, FormDatePicker)
5. Add client-side validation for all fields
6. Create handleSubmit function
7. Integrate with PUT API endpoint
8. Add error handling and notifications
9. Implement modal open/close logic with focus restoration

### Phase 6: Create Product Owner Modal (2-3 days) **NEW**
1. Create Create Product Owner modal (reuse Edit modal structure)
2. Implement handleCreate workflow (create product owner → associate with client group)
3. Add POST integration for /product-owners and /client-group-product-owners
4. Test creation flow end-to-end
5. Add validation for required fields (firstname, surname)

### Phase 7: Polish & Accessibility (2 days)
1. Fix keyboard navigation vs row click conflict (tabindex management)
2. Implement ARIA labels with context (e.g., "Edit John Smith")
3. Test with screen reader (NVDA/JAWS)
4. Add focus management and focus trap in modals
5. Refine visual design and hover states
6. Test responsive behavior (desktop, tablet, mobile)

### Phase 8: Testing (2-3 days)
1. Write unit tests for helper functions (age calc, sort, validation)
2. Write component tests for table, modals, action buttons
3. Write integration tests
4. Perform manual QA testing
5. Fix bugs and edge cases

**Total Estimated Time: 13-19 days** (simplified from original)
- **Phase 0**: < 1 day (dependency installation, endpoint verification)
- **Phases 1-2**: 3-5 days (table display + sorting)
- **Phases 3-4**: 2-3 days (status management + delete)
- **Phases 5-6**: 6-8 days (edit modal + create modal with progressive disclosure)
- **Phases 7-8**: 4-5 days (accessibility + testing)

---

## 11. Success Metrics

### 11.1 Functional Completeness
- ✅ Table displays all product owners with 7 columns using semantic HTML
- ✅ **Create new product owner functionality works**
- ✅ Sorting works for all columns with ARIA attributes
- ✅ Status transitions work correctly (active ↔ lapsed/deceased)
- ✅ Delete functionality with confirmation works (inactive only)
- ✅ Edit modal with progressive disclosure (tabs) opens and saves changes
- ✅ Inactive rows are visually distinct and automatically sort to bottom
- ✅ Keyboard navigation works without conflicts

### 11.2 Performance Metrics
- Page load time: <2 seconds for 50 product owners
- Sort operation: <100ms for 100 product owners
- Modal open time: <200ms
- API response time: <500ms for CRUD operations

### 11.3 User Experience Metrics
- Task completion rate: >95% for basic operations
- Error rate: <5% for form submissions
- User satisfaction: >4.0/5.0 in surveys
- Accessibility score: 100% in Lighthouse audit

### 11.4 Code Quality Metrics
- Test coverage: ≥70% (per project standards)
- No critical ESLint errors
- No console errors in production
- Typescript strict mode compliance

---

## 12. Future Enhancements

### 12.1 Phase 2 Enhancements (Post-Launch)

**Search & Filtering**
- Global search across all fields
- Filter by status (active/lapsed/deceased)
- Filter by relationship status
- Advanced multi-field filters

**Bulk Operations**
- Multi-select checkboxes
- Bulk status changes
- Bulk deletion (inactive only)
- Export selected to CSV

**Drag-and-Drop Ordering**
- Similar to Summary tab's Client Order section
- Update display_order via PUT endpoint
- Visual feedback during drag
- Save order button

**Audit History**
- Track all changes to product owners
- "View History" button in actions column
- Modal showing timeline of changes
- Integration with `holding_activity_log` table pattern

### 12.2 Advanced Features (Future Roadmap)

**Column Customization**
- User can show/hide columns
- Reorder columns via drag-and-drop
- Save preferences per user

**Export Functionality**
- Export to CSV/Excel
- Export to PDF (formatted report)
- Email export to client

**Duplicate Detection**
- Warn when creating similar product owners
- Suggest merging duplicates
- Automated duplicate detection algorithm

**Relationship Mapping**
- Visual relationship graph
- Link related product owners
- Family tree view

**Document Attachments**
- Upload and attach documents (passport, ID, etc.)
- View attached documents in edit modal
- Integration with document management system

---

## Appendix A: Component File Structure

```
frontend/src/pages/ClientGroupSuite/
├── tabs/
│   ├── BasicDetailsTab.tsx (parent component)
│   └── components/
│       ├── PeopleSubTab.tsx (main implementation)
│       ├── ProductOwnerTable.tsx (table component)
│       ├── ProductOwnerRow.tsx (individual row)
│       ├── EditProductOwnerModal.tsx (edit modal)
│       ├── DeleteConfirmationModal.tsx (delete modal)
│       └── StatusBadge.tsx (status display)
```

---

## Appendix B: API Endpoint Reference

### GET Product Owners
```
GET /client-groups/{client_group_id}/product-owners

Response: 200 OK
[
  {
    "id": 1,
    "status": "active",
    "firstname": "John",
    "surname": "Smith",
    "known_as": "Johnny",
    "title": "Mr",
    "middle_names": "Michael",
    "relationship_status": "Married",
    "gender": "Male",
    "dob": "1975-06-15",
    "email_1": "john.smith@example.com",
    "address_line_1": "123 Main St",
    ...
  }
]
```

### UPDATE Product Owner
```
PUT /product-owners/{product_owner_id}

Request Body:
{
  "status": "lapsed",
  "email_1": "newemail@example.com"
}

Response: 200 OK
{
  "id": 1,
  "status": "lapsed",
  "email_1": "newemail@example.com",
  ...
}
```

### DELETE Product Owner
```
DELETE /product-owners/{product_owner_id}

Response: 204 No Content
```

---

## Appendix C: TypeScript Interfaces

```typescript
// Product Owner Interface (complete)
interface ProductOwner {
  // Core identity (6 fields)
  id: number;
  status: 'active' | 'lapsed' | 'deceased';
  firstname: string;
  surname: string;
  known_as: string | null;
  title: string | null;
  middle_names: string | null;

  // Personal details (5 fields)
  relationship_status: string | null;
  gender: string | null;
  previous_names: string | null;
  dob: string | null; // ISO date string
  place_of_birth: string | null;

  // Contact information (4 fields)
  email_1: string | null;
  email_2: string | null;
  phone_1: string | null;
  phone_2: string | null;

  // Residential (7 fields)
  moved_in_date: string | null;
  address_id: number | null;
  address_line_1?: string | null; // From joined addresses table
  address_line_2?: string | null;
  address_line_3?: string | null;
  address_line_4?: string | null;
  address_line_5?: string | null;

  // Profiling (2 fields)
  three_words: string | null;
  share_data_with: string | null;

  // Employment (2 fields)
  employment_status: string | null;
  occupation: string | null;

  // Compliance (4 fields)
  passport_expiry_date: string | null;
  ni_number: string | null;
  aml_result: string | null;
  aml_date: string | null;

  // Metadata
  created_at: string;
}

// Sort Configuration
interface SortConfig {
  key: keyof ProductOwner;
  direction: 'asc' | 'desc' | 'default';
}

// Form Validation Errors
interface ValidationErrors {
  [key: string]: string;
}

// Table Column Definition
interface TableColumn {
  key: keyof ProductOwner | 'age' | 'actions';
  label: string;
  sortable: boolean;
  render?: (value: any, row: ProductOwner) => React.ReactNode;
}
```

---

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-04 | Claude Code | Initial specification document |
| 2.0 | 2025-12-04 | Claude Code | **Major Revision** - Incorporated critical analysis findings:<br>• Added CREATE functionality (was deferred to Phase 2)<br>• Verified all backend API endpoints exist<br>• Added audit logging requirements (FCA compliance)<br>• Added deceased_date field to schema<br>• Specified HeadlessUI Dialog component<br>• Added progressive disclosure (tabs) for 31-field modal<br>• Mandated semantic HTML table structure with ARIA<br>• Fixed keyboard navigation conflict<br>• Updated timeline: 16-23 days (from 13-18 days)<br>• Added Phase 0 for backend updates<br>• See `critical_analysis/analysis_20251204_142742.md` for full review |
| 3.0 | 2025-12-05 | Claude Code | **Simplified Requirements**:<br>• REMOVED audit logging requirements (not needed)<br>• REMOVED deceased_date field requirement (not needed)<br>• REMOVED authorization/permissions requirements (simplified to authentication only)<br>• All authenticated users can access all client groups<br>• Updated field counts: 31 → 30 fields in modal<br>• Simplified Phase 0: < 1 day (removed backend migrations)<br>• Simplified Phase 3: 1-2 days (removed deceased date modal)<br>• Updated timeline: 13-19 days (from 16-23 days)<br>• Updated success metrics to remove audit logging |

---

**End of Specification Document**
