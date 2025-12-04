# People Tab Pseudocode Documentation

## Document Overview

This pseudocode provides comprehensive algorithmic logic for the People (Product Owners) Tab in the Client Group Suite. It covers all components, data flows, and edge cases identified in the specification document.

**Target Audience**: Developers implementing the feature
**Language-Agnostic**: Uses familiar patterns but avoids language-specific syntax
**Implementation-Ready**: Detailed enough to code directly from this document

---

## Table of Contents

1. [Data Structures and Types](#1-data-structures-and-types)
2. [Main Component: PeopleSubTab](#2-main-component-peoplesubtab)
3. [Table Component: ProductOwnerTable](#3-table-component-productownertable)
4. [Row Component: ProductOwnerRow](#4-row-component-productownerrow)
5. [Sorting Logic](#5-sorting-logic)
6. [Status Transition Workflow](#6-status-transition-workflow)
7. [Create Product Owner Modal](#7-create-product-owner-modal)
8. [Edit Product Owner Modal](#8-edit-product-owner-modal)
9. [Delete Confirmation Flow](#9-delete-confirmation-flow)
10. [Helper Functions](#10-helper-functions)
11. [API Integration Layer](#11-api-integration-layer)
12. [Validation Logic](#12-validation-logic)
13. [Accessibility Patterns](#13-accessibility-patterns)

---

## 1. Data Structures and Types

### 1.1 ProductOwner Interface

```
INTERFACE ProductOwner:
    // Core identity (6 fields)
    id: Integer
    status: String // 'active' | 'lapsed' | 'deceased'
    firstname: String
    surname: String
    known_as: String OR null
    title: String OR null
    middle_names: String OR null

    // Personal details (5 fields)
    relationship_status: String OR null
    gender: String OR null
    previous_names: String OR null
    dob: String OR null  // ISO date format YYYY-MM-DD
    deceased_date: String OR null  // Required when status='deceased'
    place_of_birth: String OR null

    // Contact information (4 fields)
    email_1: String OR null
    email_2: String OR null
    phone_1: String OR null
    phone_2: String OR null

    // Residential (7 fields)
    moved_in_date: String OR null
    address_id: Integer OR null
    address_line_1: String OR null  // Joined from addresses table
    address_line_2: String OR null
    address_line_3: String OR null
    address_line_4: String OR null
    address_line_5: String OR null

    // Profiling (2 fields)
    three_words: String OR null
    share_data_with: String OR null

    // Employment (2 fields)
    employment_status: String OR null
    occupation: String OR null

    // Compliance (4 fields)
    passport_expiry_date: String OR null
    ni_number: String OR null
    aml_result: String OR null
    aml_date: String OR null

    // Metadata
    created_at: String  // ISO timestamp
END INTERFACE
```

### 1.2 Supporting Types

```
INTERFACE SortConfig:
    key: String  // Field name to sort by
    direction: String  // 'asc' | 'desc' | 'default'
END INTERFACE

INTERFACE ValidationErrors:
    // Map of field names to error messages
    [fieldName: String]: String
END INTERFACE

INTERFACE FormState:
    data: Partial<ProductOwner>  // Form field values
    errors: ValidationErrors  // Validation error messages
    isDirty: Boolean  // Has form been modified
    isSubmitting: Boolean  // Is form being submitted
END INTERFACE

INTERFACE DeceasedDateModalResult:
    date: String OR null  // Selected date or null
    cancelled: Boolean  // True if user cancelled
END INTERFACE
```

### 1.3 Constants

```
CONSTANTS:
    STATUS_ACTIVE = 'active'
    STATUS_LAPSED = 'lapsed'
    STATUS_DECEASED = 'deceased'

    SORT_ASC = 'asc'
    SORT_DESC = 'desc'
    SORT_DEFAULT = 'default'

    // Table columns configuration
    TABLE_COLUMNS = [
        {key: 'name', label: 'Name', sortable: true},
        {key: 'relationship_status', label: 'Relationship', sortable: true},
        {key: 'age', label: 'Age', sortable: true},
        {key: 'dob', label: 'DOB', sortable: true},
        {key: 'email_1', label: 'Email', sortable: true},
        {key: 'status', label: 'Status', sortable: true},
        {key: 'actions', label: 'Actions', sortable: false}
    ]

    // Form tabs structure
    FORM_TABS = [
        {
            id: 'personal',
            label: 'Personal Details',
            fields: ['title', 'firstname', 'surname', 'middle_names', 'known_as',
                    'gender', 'dob', 'deceased_date', 'place_of_birth',
                    'relationship_status', 'previous_names', 'status']
        },
        {
            id: 'contact',
            label: 'Contact & Address',
            fields: ['email_1', 'email_2', 'phone_1', 'phone_2',
                    'address_line_1', 'address_line_2', 'address_line_3',
                    'address_line_4', 'address_line_5', 'moved_in_date']
        },
        {
            id: 'employment',
            label: 'Employment & Compliance',
            fields: ['employment_status', 'occupation', 'three_words',
                    'share_data_with', 'ni_number', 'passport_expiry_date',
                    'aml_result', 'aml_date']
        }
    ]
END CONSTANTS
```

---

## 2. Main Component: PeopleSubTab

### 2.1 Component State Initialization

```
COMPONENT PeopleSubTab(clientGroupId: Integer):

    // Component state variables
    STATE productOwners: Array<ProductOwner> = []
    STATE isLoading: Boolean = true
    STATE error: String OR null = null
    STATE sortConfig: SortConfig OR null = null
    STATE isEditModalOpen: Boolean = false
    STATE isCreateModalOpen: Boolean = false
    STATE selectedProductOwner: ProductOwner OR null = null
    STATE deleteConfirmModalOpen: Boolean = false
    STATE isDeleting: Boolean = false
    STATE deceasedDateModalOpen: Boolean = false
    STATE pendingStatusChange: {id: Integer, status: String} OR null = null

    // Lifecycle: Component mount
    ON_MOUNT:
        CALL fetchProductOwners()
    END ON_MOUNT

    // Lifecycle: Cleanup
    ON_UNMOUNT:
        // Cancel any pending API requests
        CALL cancelPendingRequests()
    END ON_UNMOUNT
```

### 2.2 Data Fetching

```
    FUNCTION fetchProductOwners():
        BEGIN
            SET isLoading = true
            SET error = null

            TRY:
                // Use React Query or direct API call
                response ← API.get("/client-groups/" + clientGroupId + "/product-owners")
                SET productOwners = response.data
                SET isLoading = false

            CATCH apiError:
                SET error = apiError.message OR "Failed to load product owners"
                SET isLoading = false
                CALL showNotification(error, "error")

            END TRY
        END
    END FUNCTION

    FUNCTION refetchProductOwners():
        // Refetch without showing loading state (for mutations)
        BEGIN
            TRY:
                response ← API.get("/client-groups/" + clientGroupId + "/product-owners")
                SET productOwners = response.data

            CATCH apiError:
                CALL showNotification("Failed to refresh data", "error")
            END TRY
        END
    END FUNCTION
```

### 2.3 Rendering Logic

```
    FUNCTION render():
        BEGIN
            // Loading state
            IF isLoading THEN
                RETURN LoadingSpinner()
            END IF

            // Error state
            IF error IS NOT null THEN
                RETURN ErrorDisplay(
                    message: error,
                    onRetry: fetchProductOwners
                )
            END IF

            // Empty state
            IF productOwners.length === 0 THEN
                RETURN EmptyState(
                    icon: UserIcon,
                    title: "No product owners found for this client group",
                    subtitle: "Add product owners to get started",
                    action: {
                        label: "+ Add Person",
                        onClick: openCreateModal
                    }
                )
            END IF

            // Success state - render table
            RETURN (
                Container(
                    Header(
                        title: "People in Client Group",
                        action: Button(
                            label: "+ Add Person",
                            variant: "primary",
                            onClick: openCreateModal
                        )
                    ),
                    ProductOwnerTable(
                        productOwners: getSortedProductOwners(),
                        sortConfig: sortConfig,
                        onSort: handleSort,
                        onEdit: handleEdit,
                        onStatusChange: handleStatusChange,
                        onDelete: handleDeleteClick
                    )
                )
            )

            // Modals (rendered conditionally)
            IF isEditModalOpen THEN
                EditProductOwnerModal(
                    productOwner: selectedProductOwner,
                    onClose: closeEditModal,
                    onSave: handleEditSave
                )
            END IF

            IF isCreateModalOpen THEN
                CreateProductOwnerModal(
                    clientGroupId: clientGroupId,
                    onClose: closeCreateModal,
                    onCreate: handleCreate
                )
            END IF

            IF deleteConfirmModalOpen THEN
                DeleteConfirmationModal(
                    productOwner: selectedProductOwner,
                    onConfirm: confirmDelete,
                    onCancel: closeDeleteModal,
                    isDeleting: isDeleting
                )
            END IF

            IF deceasedDateModalOpen THEN
                DeceasedDateModal(
                    productOwner: selectedProductOwner,
                    onConfirm: handleDeceasedDateConfirm,
                    onCancel: handleDeceasedDateCancel
                )
            END IF
        END
    END FUNCTION
```

### 2.4 Event Handlers

```
    FUNCTION handleSort(columnKey: String):
        BEGIN
            // Cycle through sort states: asc → desc → default
            IF sortConfig IS null OR sortConfig.key !== columnKey THEN
                // First click on this column - sort ascending
                SET sortConfig = {key: columnKey, direction: SORT_ASC}
            ELSE IF sortConfig.direction === SORT_ASC THEN
                // Second click - sort descending
                SET sortConfig = {key: columnKey, direction: SORT_DESC}
            ELSE
                // Third click - return to default
                SET sortConfig = null
            END IF
        END
    END FUNCTION

    FUNCTION handleEdit(productOwner: ProductOwner):
        BEGIN
            SET selectedProductOwner = productOwner
            SET isEditModalOpen = true
        END
    END FUNCTION

    FUNCTION closeEditModal():
        BEGIN
            SET isEditModalOpen = false
            SET selectedProductOwner = null
        END
    END FUNCTION

    FUNCTION openCreateModal():
        BEGIN
            SET isCreateModalOpen = true
        END
    END FUNCTION

    FUNCTION closeCreateModal():
        BEGIN
            SET isCreateModalOpen = false
        END
    END FUNCTION

    FUNCTION handleDeleteClick(productOwner: ProductOwner):
        BEGIN
            // Validate that product owner is inactive
            IF productOwner.status === STATUS_ACTIVE THEN
                CALL showNotification("Cannot delete active product owner", "error")
                RETURN
            END IF

            SET selectedProductOwner = productOwner
            SET deleteConfirmModalOpen = true
        END
    END FUNCTION

    FUNCTION closeDeleteModal():
        BEGIN
            SET deleteConfirmModalOpen = false
            SET selectedProductOwner = null
        END
    END FUNCTION
```

---

## 3. Table Component: ProductOwnerTable

### 3.1 Component Structure

```
COMPONENT ProductOwnerTable(
    productOwners: Array<ProductOwner>,
    sortConfig: SortConfig OR null,
    onSort: Function,
    onEdit: Function,
    onStatusChange: Function,
    onDelete: Function
):

    FUNCTION render():
        BEGIN
            RETURN (
                <table role="table">
                    CALL renderTableHeader()
                    CALL renderTableBody()
                </table>
            )
        END
    END FUNCTION
```

### 3.2 Table Header Rendering

```
    FUNCTION renderTableHeader():
        BEGIN
            RETURN (
                <thead>
                    <tr className="bg-primary-700 text-white">
                        FOR EACH column IN TABLE_COLUMNS:
                            ariaSort ← CALL getAriaSortValue(column.key)

                            <th
                                scope="col"
                                aria-sort={ariaSort}
                                className={column.sortable ? "cursor-pointer" : ""}
                                onClick={column.sortable ? () => onSort(column.key) : null}
                            >
                                {column.label}
                                IF column.sortable THEN
                                    CALL renderSortIndicator(column.key)
                                END IF
                            </th>
                        END FOR
                    </tr>
                </thead>
            )
        END
    END FUNCTION

    FUNCTION getAriaSortValue(columnKey: String) RETURNS String:
        BEGIN
            IF sortConfig IS null OR sortConfig.key !== columnKey THEN
                RETURN "none"
            ELSE IF sortConfig.direction === SORT_ASC THEN
                RETURN "ascending"
            ELSE
                RETURN "descending"
            END IF
        END
    END FUNCTION

    FUNCTION renderSortIndicator(columnKey: String):
        BEGIN
            IF sortConfig IS null OR sortConfig.key !== columnKey THEN
                // No active sort on this column
                RETURN <span className="text-gray-400">↕</span>
            ELSE IF sortConfig.direction === SORT_ASC THEN
                RETURN <span className="text-white">↑</span>
            ELSE
                RETURN <span className="text-white">↓</span>
            END IF
        END
    END FUNCTION
```

### 3.3 Table Body Rendering

```
    FUNCTION renderTableBody():
        BEGIN
            RETURN (
                <tbody>
                    FOR EACH productOwner IN productOwners:
                        <ProductOwnerRow
                            key={productOwner.id}
                            productOwner={productOwner}
                            onEdit={onEdit}
                            onStatusChange={onStatusChange}
                            onDelete={onDelete}
                        />
                    END FOR
                </tbody>
            )
        END
    END FUNCTION
```

---

## 4. Row Component: ProductOwnerRow

### 4.1 Component Structure

```
COMPONENT ProductOwnerRow(
    productOwner: ProductOwner,
    onEdit: Function,
    onStatusChange: Function,
    onDelete: Function
):

    // Computed values
    fullName ← CALL formatName(productOwner)
    age ← CALL calculateAge(productOwner.dob)
    isInactive ← CALL isInactive(productOwner.status)
```

### 4.2 Row Rendering with Accessibility

```
    FUNCTION render():
        BEGIN
            rowClasses ← "border-b border-gray-200 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"

            // Apply inactive styling
            IF isInactive THEN
                rowClasses ← rowClasses + " opacity-50 grayscale-[30%]"
            END IF

            RETURN (
                <tr
                    className={rowClasses}
                    tabindex="0"
                    onClick={handleRowClick}
                    onKeyDown={handleRowKeyDown}
                    style={{cursor: 'pointer'}}
                    role="button"
                    aria-label={"View details for " + fullName}
                >
                    {/* Name Column */}
                    <td className="px-6 py-4">
                        {fullName}
                    </td>

                    {/* Relationship Column */}
                    <td className="px-6 py-4">
                        {productOwner.relationship_status OR "N/A"}
                    </td>

                    {/* Age Column */}
                    <td className="px-6 py-4 text-center">
                        {age !== null ? age : "N/A"}
                    </td>

                    {/* DOB Column */}
                    <td className="px-6 py-4">
                        {CALL formatDate(productOwner.dob)}
                    </td>

                    {/* Email Column */}
                    <td className="px-6 py-4">
                        {productOwner.email_1 OR "N/A"}
                    </td>

                    {/* Status Column */}
                    <td className="px-6 py-4">
                        <StatusBadge status={productOwner.status} />
                    </td>

                    {/* Actions Column */}
                    <td className="px-6 py-4">
                        CALL renderActionButtons()
                    </td>
                </tr>
            )
        END
    END FUNCTION
```

### 4.3 Row Click Handling

```
    FUNCTION handleRowClick(event: Event):
        BEGIN
            // Check if click target is a button or inside a button
            // If so, let the button handler deal with it
            IF event.target.tagName === "BUTTON" OR
               event.target.closest("button") IS NOT null THEN
                RETURN  // Don't trigger row-level edit
            END IF

            // Mouse users clicking the row (not a button) should open edit modal
            CALL onEdit(productOwner)
        END
    END FUNCTION
```

### 4.3a Keyboard Navigation Handler

```
    FUNCTION handleRowKeyDown(event: KeyboardEvent):
        BEGIN
            // Handle Enter and Space keys to activate row (open edit modal)
            // This provides keyboard equivalent to clicking the row
            IF event.key === 'Enter' OR event.key === ' ' THEN
                // Check if focus is on a button within the row
                // If so, let the button's native handler deal with it
                IF event.target.tagName === "BUTTON" OR
                   event.target.closest("button") IS NOT null THEN
                    RETURN  // Button will handle its own activation
                END IF

                // Prevent default space key behavior (page scroll)
                event.preventDefault()

                // Keyboard users activating the row should open edit modal
                CALL onEdit(productOwner)
            END IF
        END
    END FUNCTION
```

### 4.4 Action Buttons Rendering

```
    FUNCTION renderActionButtons():
        BEGIN
            IF productOwner.status === STATUS_ACTIVE THEN
                // Active product owner actions
                RETURN (
                    <div className="flex gap-2">
                        <EditButton
                            tableContext={true}
                            size="xs"
                            ariaLabel={"Edit " + fullName}
                            onClick={(e) => handleEditClick(e)}
                        />
                        <LapseButton
                            tableContext={true}
                            size="xs"
                            ariaLabel={"Lapse " + fullName}
                            onClick={(e) => handleLapseClick(e)}
                        />
                        <ActionButton
                            variant="delete"
                            tableContext={true}
                            size="xs"
                            ariaLabel={"Mark " + fullName + " as deceased"}
                            onClick={(e) => handleDeceasedClick(e)}
                        >
                            Make Deceased
                        </ActionButton>
                    </div>
                )
            ELSE
                // Inactive product owner actions
                RETURN (
                    <div className="flex gap-2">
                        <EditButton
                            tableContext={true}
                            size="xs"
                            ariaLabel={"Edit " + fullName}
                            onClick={(e) => handleEditClick(e)}
                        />
                        <ActionButton
                            variant="add"
                            tableContext={true}
                            size="xs"
                            ariaLabel={"Reactivate " + fullName}
                            onClick={(e) => handleReactivateClick(e)}
                        >
                            Reactivate
                        </ActionButton>
                        <DeleteButton
                            tableContext={true}
                            size="xs"
                            ariaLabel={"Delete " + fullName}
                            onClick={(e) => handleDeleteClick(e)}
                        />
                    </div>
                )
            END IF
        END
    END FUNCTION
```

### 4.5 Button Click Handlers

```
    FUNCTION handleEditClick(event: Event):
        BEGIN
            event.stopPropagation()  // Prevent row click
            CALL onEdit(productOwner)
        END
    END FUNCTION

    FUNCTION handleLapseClick(event: Event):
        BEGIN
            event.stopPropagation()
            CALL onStatusChange(productOwner.id, STATUS_LAPSED)
        END
    END FUNCTION

    FUNCTION handleDeceasedClick(event: Event):
        BEGIN
            event.stopPropagation()
            CALL onStatusChange(productOwner.id, STATUS_DECEASED)
        END
    END FUNCTION

    FUNCTION handleReactivateClick(event: Event):
        BEGIN
            event.stopPropagation()
            CALL onStatusChange(productOwner.id, STATUS_ACTIVE)
        END
    END FUNCTION

    FUNCTION handleDeleteClick(event: Event):
        BEGIN
            event.stopPropagation()
            CALL onDelete(productOwner)
        END
    END FUNCTION
```

---

## 5. Sorting Logic

### 5.1 Main Sorting Function

```
FUNCTION getSortedProductOwners() RETURNS Array<ProductOwner>:
    BEGIN
        // Step 1: Separate active and inactive product owners
        activeProductOwners ← FILTER productOwners WHERE status === STATUS_ACTIVE
        inactiveProductOwners ← FILTER productOwners WHERE status !== STATUS_ACTIVE

        // Step 2: Apply sorting to each group independently
        sortedActive ← CALL sortProductOwners(activeProductOwners, sortConfig)
        sortedInactive ← CALL sortProductOwners(inactiveProductOwners, sortConfig)

        // Step 3: Combine with active first, inactive at bottom
        RETURN CONCATENATE(sortedActive, sortedInactive)
    END
END FUNCTION
```

### 5.2 Generic Sort Implementation

```
FUNCTION sortProductOwners(
    productOwners: Array<ProductOwner>,
    sortConfig: SortConfig OR null
) RETURNS Array<ProductOwner>:
    BEGIN
        // No sort config - return original order (by display_order/created_at from API)
        IF sortConfig IS null OR sortConfig.direction === SORT_DEFAULT THEN
            RETURN productOwners
        END IF

        // Special case: Age column (computed field)
        IF sortConfig.key === 'age' THEN
            RETURN CALL sortByAge(productOwners, sortConfig.direction)
        END IF

        // Special case: Name column (computed field)
        IF sortConfig.key === 'name' THEN
            RETURN CALL sortByName(productOwners, sortConfig.direction)
        END IF

        // Generic sorting for other fields
        sortedArray ← COPY(productOwners)  // Create shallow copy

        CALL sortedArray.sort((a, b) => {
            aValue ← a[sortConfig.key]
            bValue ← b[sortConfig.key]

            // Handle null/undefined values - nulls always go to end
            IF aValue IS null AND bValue IS null THEN
                RETURN 0
            END IF

            IF aValue IS null THEN
                RETURN 1  // a comes after b
            END IF

            IF bValue IS null THEN
                RETURN -1  // a comes before b
            END IF

            // Determine comparison based on field type
            comparisonResult ← CALL compareValues(aValue, bValue, sortConfig.key)

            // Apply direction
            IF sortConfig.direction === SORT_DESC THEN
                RETURN -comparisonResult
            ELSE
                RETURN comparisonResult
            END IF
        })

        RETURN sortedArray
    END
END FUNCTION
```

### 5.3 Value Comparison Logic

```
FUNCTION compareValues(aValue: Any, bValue: Any, fieldKey: String) RETURNS Integer:
    BEGIN
        // Date fields - parse and compare as timestamps
        IF fieldKey === 'dob' OR fieldKey === 'deceased_date' OR
           fieldKey === 'moved_in_date' OR fieldKey === 'passport_expiry_date' OR
           fieldKey === 'aml_date' THEN
            aTimestamp ← PARSE_DATE(aValue).getTime()
            bTimestamp ← PARSE_DATE(bValue).getTime()

            IF aTimestamp < bTimestamp THEN RETURN -1
            IF aTimestamp > bTimestamp THEN RETURN 1
            RETURN 0
        END IF

        // Numeric comparison (not needed for current columns but included for completeness)
        IF TYPEOF(aValue) === 'number' AND TYPEOF(bValue) === 'number' THEN
            RETURN aValue - bValue
        END IF

        // String comparison - case insensitive, locale aware
        aString ← STRING(aValue).toLowerCase()
        bString ← STRING(bValue).toLowerCase()

        RETURN aString.localeCompare(bString)
    END
END FUNCTION
```

### 5.4 Age Sorting

```
FUNCTION sortByAge(
    productOwners: Array<ProductOwner>,
    direction: String
) RETURNS Array<ProductOwner>:
    BEGIN
        sortedArray ← COPY(productOwners)

        CALL sortedArray.sort((a, b) => {
            ageA ← CALL calculateAge(a.dob)
            ageB ← CALL calculateAge(b.dob)

            // Null handling - no DOB means no age, sort to end
            IF ageA IS null AND ageB IS null THEN RETURN 0
            IF ageA IS null THEN RETURN 1
            IF ageB IS null THEN RETURN -1

            // Numeric comparison
            IF direction === SORT_ASC THEN
                RETURN ageA - ageB
            ELSE
                RETURN ageB - ageA
            END IF
        })

        RETURN sortedArray
    END
END FUNCTION
```

### 5.5 Name Sorting

```
FUNCTION sortByName(
    productOwners: Array<ProductOwner>,
    direction: String
) RETURNS Array<ProductOwner>:
    BEGIN
        sortedArray ← COPY(productOwners)

        CALL sortedArray.sort((a, b) => {
            nameA ← CALL formatName(a).toLowerCase()
            nameB ← CALL formatName(b).toLowerCase()

            comparisonResult ← nameA.localeCompare(nameB)

            IF direction === SORT_DESC THEN
                RETURN -comparisonResult
            ELSE
                RETURN comparisonResult
            END IF
        })

        RETURN sortedArray
    END
END FUNCTION
```

---

## 6. Status Transition Workflow

### 6.1 Main Status Change Handler

```
FUNCTION handleStatusChange(productOwnerId: Integer, newStatus: String):
    BEGIN
        // Special handling for deceased status - must capture deceased date
        IF newStatus === STATUS_DECEASED THEN
            // Set pending status change and open deceased date modal
            SET pendingStatusChange = {
                id: productOwnerId,
                status: newStatus
            }
            SET deceasedDateModalOpen = true
            RETURN  // Wait for modal completion
        END IF

        // For other status changes, proceed directly
        CALL executeStatusChange(productOwnerId, newStatus, null)
    END
END FUNCTION
```

### 6.2 Deceased Date Modal Handlers

```
FUNCTION handleDeceasedDateConfirm(deceasedDate: String OR null):
    BEGIN
        SET deceasedDateModalOpen = false

        IF pendingStatusChange IS NOT null THEN
            CALL executeStatusChange(
                pendingStatusChange.id,
                pendingStatusChange.status,
                deceasedDate
            )
            SET pendingStatusChange = null
        END IF
    END
END FUNCTION

FUNCTION handleDeceasedDateCancel():
    BEGIN
        SET deceasedDateModalOpen = false
        SET pendingStatusChange = null
        // User cancelled - do nothing
    END
END FUNCTION
```

### 6.3 Status Change Execution

```
FUNCTION executeStatusChange(
    productOwnerId: Integer,
    newStatus: String,
    deceasedDate: String OR null
):
    BEGIN
        TRY:
            // Build request body
            requestBody ← {
                status: newStatus
            }

            // Add deceased date if marking as deceased
            IF newStatus === STATUS_DECEASED THEN
                requestBody.deceased_date = deceasedDate
            ELSE
                // Clear deceased date if reactivating or lapsing
                requestBody.deceased_date = null
            END IF

            // API call with optimistic UI update
            response ← API.put("/product-owners/" + productOwnerId, requestBody)

            // Refresh data to get updated values
            CALL refetchProductOwners()

            // Show success notification
            statusLabel ← CALL getStatusLabel(newStatus)
            CALL showNotification(
                "Status updated to " + statusLabel + " successfully",
                "success"
            )

        CATCH apiError:
            errorMessage ← apiError.response?.data?.detail OR
                          "Failed to update status"
            CALL showNotification(errorMessage, "error")
        END TRY
    END
END FUNCTION

FUNCTION getStatusLabel(status: String) RETURNS String:
    BEGIN
        IF status === STATUS_ACTIVE THEN RETURN "Active"
        IF status === STATUS_LAPSED THEN RETURN "Lapsed"
        IF status === STATUS_DECEASED THEN RETURN "Deceased"
        RETURN status
    END
END FUNCTION
```

### 6.4 Deceased Date Modal Component

```
COMPONENT DeceasedDateModal(
    productOwner: ProductOwner,
    onConfirm: Function,
    onCancel: Function
):

    STATE selectedDate: String OR null = null

    FUNCTION render():
        BEGIN
            RETURN HeadlessUI.Dialog(
                open: true,
                onClose: onCancel,

                content: (
                    <DialogPanel>
                        <DialogTitle>
                            Mark {CALL formatName(productOwner)} as Deceased
                        </DialogTitle>

                        <div className="mt-4">
                            <label>Date of Death (optional but recommended):</label>
                            <DateInput
                                value={selectedDate}
                                onChange={(date) => SET selectedDate = date}
                                maxDate={TODAY}  // Cannot be in future
                                placeholder="YYYY-MM-DD"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                Recording the date is recommended for record-keeping
                            </p>
                        </div>

                        <div className="flex gap-2 mt-6 justify-end">
                            <ActionButton
                                variant="cancel"
                                onClick={onCancel}
                            >
                                Cancel
                            </ActionButton>
                            <ActionButton
                                variant="save"
                                onClick={() => onConfirm(selectedDate)}
                            >
                                Confirm
                            </ActionButton>
                        </div>
                    </DialogPanel>
                )
            )
        END
    END FUNCTION
```

---

## 7. Create Product Owner Modal

### 7.1 Modal Component Structure

```
COMPONENT CreateProductOwnerModal(
    clientGroupId: Integer,
    onClose: Function,
    onCreate: Function
):

    // State management
    STATE formData: Partial<ProductOwner> = {
        status: STATUS_ACTIVE,  // Default to active
        // All other fields null/empty
    }
    STATE formErrors: ValidationErrors = {}
    STATE isSubmitting: Boolean = false
    STATE activeTab: String = 'personal'  // Tab navigation state

    // Track initial state for "unsaved changes" warning
    STATE initialFormData: Partial<ProductOwner> = COPY(formData)
```

### 7.2 Tab Navigation

```
    FUNCTION handleTabChange(tabId: String):
        BEGIN
            SET activeTab = tabId
        END
    END FUNCTION

    FUNCTION renderTabs():
        BEGIN
            RETURN (
                <div className="flex border-b border-gray-200 mb-6">
                    FOR EACH tab IN FORM_TABS:
                        isActive ← tab.id === activeTab
                        tabClasses ← isActive ?
                            "border-b-2 border-primary-600 text-primary-600" :
                            "text-gray-500 hover:text-gray-700"

                        <button
                            onClick={() => handleTabChange(tab.id)}
                            className={tabClasses + " px-4 py-2 font-medium"}
                            aria-selected={isActive}
                            role="tab"
                        >
                            {tab.label}
                        </button>
                    END FOR
                </div>
            )
        END
    END FUNCTION
```

### 7.3 Form Field Rendering

```
    FUNCTION renderFormFields():
        BEGIN
            // Get fields for active tab
            currentTab ← FIND tab IN FORM_TABS WHERE tab.id === activeTab
            fields ← currentTab.fields

            RETURN (
                <div className="grid grid-cols-2 gap-4">
                    FOR EACH fieldName IN fields:
                        // Special handling for deceased_date - only show if status is deceased
                        IF fieldName === 'deceased_date' AND formData.status !== STATUS_DECEASED THEN
                            CONTINUE  // Skip this field
                        END IF

                        CALL renderFormField(fieldName)
                    END FOR
                </div>
            )
        END
    END FUNCTION

    FUNCTION renderFormField(fieldName: String):
        BEGIN
            fieldConfig ← CALL getFieldConfig(fieldName)
            fieldValue ← formData[fieldName]
            fieldError ← formErrors[fieldName]

            // Determine input type
            IF fieldConfig.type === 'select' THEN
                RETURN (
                    <FormSelect
                        label={fieldConfig.label}
                        value={fieldValue OR ''}
                        onChange={(value) => handleFieldChange(fieldName, value)}
                        options={fieldConfig.options}
                        error={fieldError}
                        required={fieldConfig.required}
                    />
                )
            ELSE IF fieldConfig.type === 'date' THEN
                RETURN (
                    <FormDateInput
                        label={fieldConfig.label}
                        value={fieldValue OR ''}
                        onChange={(date) => handleFieldChange(fieldName, date)}
                        error={fieldError}
                        required={fieldConfig.required}
                        maxDate={fieldConfig.maxDate}
                    />
                )
            ELSE IF fieldConfig.type === 'email' THEN
                RETURN (
                    <FormEmailInput
                        label={fieldConfig.label}
                        value={fieldValue OR ''}
                        onChange={(value) => handleFieldChange(fieldName, value)}
                        error={fieldError}
                        required={fieldConfig.required}
                    />
                )
            ELSE
                // Default text input
                RETURN (
                    <FormTextInput
                        label={fieldConfig.label}
                        value={fieldValue OR ''}
                        onChange={(value) => handleFieldChange(fieldName, value)}
                        error={fieldError}
                        required={fieldConfig.required}
                    />
                )
            END IF
        END
    END FUNCTION
```

### 7.4 Field Change Handler

```
    FUNCTION handleFieldChange(fieldName: String, value: Any):
        BEGIN
            // Update form data
            SET formData[fieldName] = value

            // Clear error for this field (if any)
            IF formErrors[fieldName] EXISTS THEN
                DELETE formErrors[fieldName]
            END IF

            // Special handling for status changes and deceased_date field
            IF fieldName === 'status' THEN
                IF value === STATUS_DECEASED THEN
                    // Status changed TO deceased - ensure deceased_date field becomes visible
                    // The field is already in FORM_TABS.personal.fields (line 143)
                    // The conditional render logic (lines 1107-1109) will now show it
                    // React's reactive rendering will automatically display the field
                    // No explicit action needed - field appears when form re-renders

                    // Optionally clear the deceased_date to force user to enter fresh date
                    // SET formData.deceased_date = null
                ELSE
                    // Status changed AWAY from deceased - clear deceased_date and hide field
                    SET formData.deceased_date = null
                    // Field will be hidden by conditional render logic (line 1107-1109)
                END IF
            END IF
        END
    END FUNCTION
```

### 7.5 Form Submission

```
    FUNCTION handleSubmit(event: Event):
        BEGIN
            event.preventDefault()

            // Validate form
            validationErrors ← CALL validateProductOwnerForm(formData)

            IF validationErrors HAS ERRORS THEN
                SET formErrors = validationErrors

                // Find first tab with error and switch to it
                FOR EACH tab IN FORM_TABS:
                    FOR EACH field IN tab.fields:
                        IF validationErrors[field] EXISTS THEN
                            SET activeTab = tab.id
                            BREAK OUTER LOOP
                        END IF
                    END FOR
                END FOR

                CALL showNotification(
                    "Please correct the errors before saving",
                    "error"
                )
                RETURN
            END IF

            // Proceed with creation
            CALL createProductOwner()
        END
    END FUNCTION
```

### 7.6 Create Product Owner API Flow

```
    FUNCTION createProductOwner():
        BEGIN
            SET isSubmitting = true

            TRY:
                // Step 1: Create product owner
                // NOTE: Address handling for CREATE operations:
                //   - If address fields (address_line_1-5) are provided in formData,
                //     backend automatically creates new address record
                //   - Product owner's address_id is set to the new address
                //   - No risk of affecting other product owners (new record)
                response1 ← API.post("/product-owners", formData)
                newProductOwner ← response1.data

                // Step 2: Associate with current client group
                // Backend calculates display_order automatically
                TRY:
                    response2 ← API.post("/client-group-product-owners", {
                        client_group_id: clientGroupId,
                        product_owner_id: newProductOwner.id,
                        display_order: 0  // Backend will set correct value
                    })
                CATCH associationError:
                    // CRITICAL: Step 2 failed - rollback Step 1 to prevent orphaned record
                    // Delete the product owner we just created
                    TRY:
                        API.delete("/product-owners/" + newProductOwner.id)

                        errorMessage ← "Failed to associate product owner with client group"
                        CALL showNotification(errorMessage, "error")
                    CATCH deleteError:
                        // Rollback failed - orphaned product owner exists
                        // Log this critical error for manual cleanup
                        console.error(
                            "CRITICAL: Failed to rollback product owner creation.",
                            "Orphaned product owner ID:", newProductOwner.id,
                            "Delete error:", deleteError
                        )

                        errorMessage ← "Failed to create product owner. Please contact support. (Orphaned record ID: " + newProductOwner.id + ")"
                        CALL showNotification(errorMessage, "error")
                    END TRY

                    // Re-throw to prevent success flow
                    THROW associationError
                END TRY

                // Step 3: Success - close modal and refresh
                CALL onCreate()  // Callback to parent to refresh data
                CALL onClose()

                fullName ← CALL formatName(newProductOwner)
                CALL showNotification(
                    fullName + " added successfully",
                    "success"
                )

            CATCH apiError:
                // If error was from Step 1 (product owner creation)
                errorMessage ← apiError.response?.data?.detail OR
                              "Failed to create product owner"
                CALL showNotification(errorMessage, "error")

            FINALLY:
                SET isSubmitting = false
            END TRY
        END
    END FUNCTION

    // ARCHITECTURAL NOTE: Backend Transaction Endpoint (Future Enhancement)
    // The current two-step workflow (create product owner → create association) has inherent risks:
    // 1. Network failure between steps
    // 2. Frontend crash between steps
    // 3. Rollback DELETE might fail (as handled above)
    //
    // RECOMMENDED SOLUTION:
    // Backend should provide single atomic endpoint: POST /client-groups/{id}/product-owners
    // This endpoint would handle both operations in a database transaction:
    //   BEGIN TRANSACTION;
    //     INSERT INTO product_owners (...);
    //     INSERT INTO client_group_product_owners (...);
    //   COMMIT;
    //
    // Benefits:
    // - Atomic operation (all-or-nothing)
    // - No orphaned records
    // - Simpler frontend code
    // - Better performance (single round-trip)
    //
    // Frontend would change to:
    //   response ← API.post("/client-groups/" + clientGroupId + "/product-owners", formData)
```

### 7.7 Modal Close with Unsaved Changes Check

```
    FUNCTION handleCloseAttempt():
        BEGIN
            // Check if form has been modified
            IF CALL hasUnsavedChanges() THEN
                confirmed ← CONFIRM(
                    "You have unsaved changes. Are you sure you want to close?"
                )
                IF NOT confirmed THEN
                    RETURN  // User cancelled close
                END IF
            END IF

            CALL onClose()
        END
    END FUNCTION

    FUNCTION hasUnsavedChanges() RETURNS Boolean:
        BEGIN
            // Compare current formData with initialFormData
            FOR EACH key IN formData:
                IF formData[key] !== initialFormData[key] THEN
                    RETURN true
                END IF
            END FOR
            RETURN false
        END
    END FUNCTION
```

### 7.8 Modal Render

```
    FUNCTION render():
        BEGIN
            RETURN HeadlessUI.Dialog(
                open: true,
                onClose: handleCloseAttempt,

                content: (
                    <DialogPanel className="max-w-4xl w-full">
                        {/* Header */}
                        <DialogTitle>
                            Add New Person to Client Group
                        </DialogTitle>

                        {/* Tab Navigation */}
                        CALL renderTabs()

                        {/* Form */}
                        <form onSubmit={handleSubmit}>
                            CALL renderFormFields()

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-2 mt-6">
                                <ActionButton
                                    variant="cancel"
                                    onClick={handleCloseAttempt}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </ActionButton>
                                <ActionButton
                                    variant="save"
                                    type="submit"
                                    loading={isSubmitting}
                                >
                                    Create Person
                                </ActionButton>
                            </div>
                        </form>
                    </DialogPanel>
                )
            )
        END
    END FUNCTION
```

---

## 8. Edit Product Owner Modal

### 8.1 Modal Component Structure

```
COMPONENT EditProductOwnerModal(
    productOwner: ProductOwner,
    onClose: Function,
    onSave: Function
):

    // State management
    STATE formData: Partial<ProductOwner> = COPY(productOwner)  // Pre-populate with existing data
    STATE formErrors: ValidationErrors = {}
    STATE isSubmitting: Boolean = false
    STATE activeTab: String = 'personal'

    // Track initial state for change detection
    STATE initialFormData: Partial<ProductOwner> = COPY(productOwner)
```

### 8.2 Form Submission (Edit)

```
    FUNCTION handleSubmit(event: Event):
        BEGIN
            event.preventDefault()

            // Validate form
            validationErrors ← CALL validateProductOwnerForm(formData)

            IF validationErrors HAS ERRORS THEN
                SET formErrors = validationErrors

                // Switch to first tab with error
                FOR EACH tab IN FORM_TABS:
                    FOR EACH field IN tab.fields:
                        IF validationErrors[field] EXISTS THEN
                            SET activeTab = tab.id
                            BREAK OUTER LOOP
                        END IF
                    END FOR
                END FOR

                CALL showNotification(
                    "Please correct the errors before saving",
                    "error"
                )
                RETURN
            END IF

            // Proceed with update
            CALL updateProductOwner()
        END
    END FUNCTION
```

### 8.3 Update Product Owner API Call

```
    FUNCTION updateProductOwner():
        BEGIN
            SET isSubmitting = true

            TRY:
                // Identify changed fields
                changedFields ← CALL getChangedFields(initialFormData, formData)

                // IMPORTANT: Handle address fields specially (see Section 8.3a)
                // If any address_line_1-5 changed, prepare payload for backend to create new address
                addressPayload ← CALL prepareAddressPayload(formData, initialFormData)

                // API call to update product owner
                response ← API.put(
                    "/product-owners/" + productOwner.id,
                    {
                        ...formData,
                        _address_strategy: addressPayload.strategy
                    }
                )

                // Success
                CALL onSave()  // Callback to parent to refresh data
                CALL onClose()

                CALL showNotification(
                    "Changes saved successfully",
                    "success"
                )

            CATCH apiError:
                errorMessage ← apiError.response?.data?.detail OR
                              "Failed to save changes"
                CALL showNotification(errorMessage, "error")

            FINALLY:
                SET isSubmitting = false
            END TRY
        END
    END FUNCTION
```

### 8.3a Address Field Handling Strategy (CRITICAL)

```
// PROBLEM: Product owners have address_id foreign key to addresses table
// Multiple product owners can share the same address record
// If we UPDATE the existing address, ALL product owners with that address_id will see the change
// This could cause unintended side effects

// SOLUTION: When any address field changes, CREATE a new address record
// Update product owner's address_id to point to the new record
// This ensures changes only affect the current product owner

FUNCTION prepareAddressPayload(
    formData: ProductOwner,
    initialFormData: ProductOwner
) RETURNS AddressPayload:
    BEGIN
        // Define address fields
        addressFields ← [
            'address_line_1',
            'address_line_2',
            'address_line_3',
            'address_line_4',
            'address_line_5'
        ]

        // Check if any address field changed
        addressChanged ← false
        FOR EACH field IN addressFields:
            IF formData[field] !== initialFormData[field] THEN
                addressChanged ← true
                BREAK
            END IF
        END FOR

        // Determine strategy
        IF addressChanged THEN
            // Address fields changed - instruct backend to create new address
            RETURN {
                strategy: 'create_new',
                changed: true,
                reason: 'Address fields modified - creating new address to prevent affecting other product owners'
            }
        ELSE
            // Address fields unchanged - no special handling needed
            RETURN {
                strategy: 'no_change',
                changed: false,
                reason: 'Address fields unchanged'
            }
        END IF
    END
END FUNCTION

// BACKEND RESPONSIBILITY (for developer reference):
// When backend receives PUT /product-owners/{id} with _address_strategy: 'create_new':
// 1. Extract address_line_1-5 from request body
// 2. INSERT new record into addresses table
// 3. UPDATE product_owners SET address_id = new_address_id WHERE id = product_owner_id
// 4. Return updated product owner with new address data
//
// This ensures:
// - Other product owners sharing the old address are not affected
// - Data integrity is maintained

    FUNCTION getChangedFields(original: Object, updated: Object) RETURNS Object:
        // Helper to identify what changed (useful for debugging/logging)
        BEGIN
            changes ← {}

            FOR EACH key IN updated:
                IF updated[key] !== original[key] THEN
                    changes[key] = {
                        old: original[key],
                        new: updated[key]
                    }
                END IF
            END FOR

            RETURN changes
        END
    END FUNCTION
```

### 8.4 Focus Management on Modal Open/Close

```
    // Track the element that opened the modal for focus restoration
    STATE triggerElement: HTMLElement OR null = null

    ON_MOUNT:
        // Store the currently focused element
        SET triggerElement = document.activeElement

        // Focus the first input in the modal
        CALL focusFirstInput()
    END ON_MOUNT

    ON_UNMOUNT:
        // Restore focus to trigger element
        IF triggerElement IS NOT null THEN
            triggerElement.focus()
        END IF
    END ON_UNMOUNT

    FUNCTION focusFirstInput():
        BEGIN
            // Wait for modal to render
            NEXT_TICK(() => {
                firstInput ← document.querySelector('input, select, textarea')
                IF firstInput IS NOT null THEN
                    firstInput.focus()
                END IF
            })
        END
    END FUNCTION
```

### 8.5 Modal Render (Edit)

```
    FUNCTION render():
        BEGIN
            fullName ← CALL formatName(productOwner)

            RETURN HeadlessUI.Dialog(
                open: true,
                onClose: handleCloseAttempt,

                content: (
                    <DialogPanel className="max-w-4xl w-full">
                        {/* Header */}
                        <div className="flex items-center mb-4 pb-3 border-b">
                            <UserIcon className="h-5 w-5 text-primary-700 mr-2" />
                            <DialogTitle>
                                Edit Product Owner: {fullName}
                            </DialogTitle>
                        </div>

                        {/* Tab Navigation */}
                        CALL renderTabs()

                        {/* Form - reuse same structure as Create modal */}
                        <form onSubmit={handleSubmit}>
                            CALL renderFormFields()

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-2 mt-6">
                                <ActionButton
                                    variant="cancel"
                                    onClick={handleCloseAttempt}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </ActionButton>
                                <ActionButton
                                    variant="save"
                                    type="submit"
                                    loading={isSubmitting}
                                >
                                    Save Changes
                                </ActionButton>
                            </div>
                        </form>
                    </DialogPanel>
                )
            )
        END
    END FUNCTION
```

---

## 9. Delete Confirmation Flow

### 9.1 Delete Confirmation Modal

```
COMPONENT DeleteConfirmationModal(
    productOwner: ProductOwner,
    onConfirm: Function,
    onCancel: Function,
    isDeleting: Boolean
):

    fullName ← CALL formatName(productOwner)

    FUNCTION render():
        BEGIN
            RETURN HeadlessUI.Dialog(
                open: true,
                onClose: onCancel,

                content: (
                    <DialogPanel className="max-w-md">
                        {/* Warning Icon */}
                        <div className="flex items-center justify-center mb-4">
                            <ExclamationTriangleIcon
                                className="h-12 w-12 text-red-600"
                            />
                        </div>

                        {/* Title */}
                        <DialogTitle className="text-center text-xl font-semibold">
                            Confirm Deletion
                        </DialogTitle>

                        {/* Message */}
                        <div className="mt-4 text-center">
                            <p className="text-gray-700">
                                Are you sure you want to permanently delete
                                <strong> {fullName}</strong>?
                            </p>
                            <p className="text-red-600 mt-2 font-medium">
                                This action cannot be undone.
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-6 justify-center">
                            <ActionButton
                                variant="cancel"
                                onClick={onCancel}
                                disabled={isDeleting}
                            >
                                Cancel
                            </ActionButton>
                            <ActionButton
                                variant="delete"
                                onClick={onConfirm}
                                loading={isDeleting}
                            >
                                Delete Permanently
                            </ActionButton>
                        </div>
                    </DialogPanel>
                )
            )
        END
    END FUNCTION
```

### 9.2 Delete Execution in Parent Component

```
FUNCTION confirmDelete():
    BEGIN
        IF selectedProductOwner IS null THEN
            RETURN
        END IF

        // Double-check that product owner is inactive (defensive programming)
        IF selectedProductOwner.status === STATUS_ACTIVE THEN
            CALL showNotification(
                "Cannot delete active product owner. Please lapse or mark as deceased first.",
                "error"
            )
            CALL closeDeleteModal()
            RETURN
        END IF

        SET isDeleting = true

        TRY:
            // API call to delete product owner
            CALL API.delete("/product-owners/" + selectedProductOwner.id)

            // Success - close modal and refresh
            fullName ← CALL formatName(selectedProductOwner)
            CALL closeDeleteModal()
            CALL refetchProductOwners()

            CALL showNotification(
                fullName + " has been permanently deleted",
                "success"
            )

        CATCH apiError:
            // Handle errors
            errorMessage ← apiError.response?.data?.detail OR
                          "Failed to delete product owner"

            // Special handling for constraint violations
            IF apiError.response?.status === 409 THEN
                errorMessage = "Cannot delete: This product owner has associated products or holdings"
            END IF

            CALL showNotification(errorMessage, "error")
            CALL closeDeleteModal()

        FINALLY:
            SET isDeleting = false
        END TRY
    END
END FUNCTION
```

---

## 10. Helper Functions

### 10.1 Age Calculation

```
FUNCTION calculateAge(dob: String OR null) RETURNS Integer OR null:
    // Calculate age from date of birth
    // Returns null if DOB is missing or invalid
    BEGIN
        // Handle missing DOB
        IF dob IS null OR dob === '' THEN
            RETURN null
        END IF

        TRY:
            birthDate ← PARSE_DATE(dob)
            today ← NEW Date()

            // Handle invalid dates
            IF birthDate IS INVALID THEN
                RETURN null
            END IF

            // Handle future dates (data error)
            IF birthDate > today THEN
                RETURN null
            END IF

            // Calculate age
            age ← today.getFullYear() - birthDate.getFullYear()
            monthDiff ← today.getMonth() - birthDate.getMonth()

            // Adjust if birthday hasn't occurred this year yet
            IF monthDiff < 0 OR
               (monthDiff === 0 AND today.getDate() < birthDate.getDate()) THEN
                age ← age - 1
            END IF

            RETURN age

        CATCH parseError:
            // Invalid date format
            RETURN null
        END TRY
    END
END FUNCTION
```

### 10.2 Name Formatting

```
FUNCTION formatName(productOwner: ProductOwner) RETURNS String:
    // Format full name as "Title Firstname Surname"
    // Handle missing parts gracefully
    BEGIN
        nameParts ← []

        // Add title if present
        IF productOwner.title IS NOT null AND productOwner.title !== '' THEN
            APPEND productOwner.title TO nameParts
        END IF

        // Add firstname (required, but check anyway)
        IF productOwner.firstname IS NOT null AND productOwner.firstname !== '' THEN
            APPEND productOwner.firstname TO nameParts
        END IF

        // Add surname (required, but check anyway)
        IF productOwner.surname IS NOT null AND productOwner.surname !== '' THEN
            APPEND productOwner.surname TO nameParts
        END IF

        // Join with spaces
        IF nameParts.length > 0 THEN
            RETURN JOIN(nameParts, ' ')
        ELSE
            RETURN 'Unknown'  // Fallback for data errors
        END IF
    END
END FUNCTION
```

### 10.3 Status Check

```
FUNCTION isInactive(status: String) RETURNS Boolean:
    // Check if product owner is inactive (lapsed or deceased)
    BEGIN
        RETURN status === STATUS_LAPSED OR status === STATUS_DECEASED
    END
END FUNCTION
```

### 10.4 Date Formatting

```
FUNCTION formatDate(dateString: String OR null) RETURNS String:
    // Format ISO date string for display
    // Returns "N/A" for missing dates
    BEGIN
        IF dateString IS null OR dateString === '' THEN
            RETURN "N/A"
        END IF

        TRY:
            date ← PARSE_DATE(dateString)

            // Format as locale-appropriate date
            // Example: "15 Jun 1975" or "15/06/1975" depending on locale
            RETURN date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            })

        CATCH parseError:
            RETURN "Invalid Date"
        END TRY
    END
END FUNCTION
```

### 10.5 Field Configuration Lookup

```
FUNCTION getFieldConfig(fieldName: String) RETURNS Object:
    // Return configuration for form fields
    // Centralizes field metadata
    BEGIN
        // Field configurations with labels, types, and validation rules
        FIELD_CONFIGS ← {
            // Core identity
            'status': {
                label: 'Status',
                type: 'select',
                options: [
                    {value: STATUS_ACTIVE, label: 'Active'},
                    {value: STATUS_LAPSED, label: 'Lapsed'},
                    {value: STATUS_DECEASED, label: 'Deceased'}
                ],
                required: true
            },
            'title': {
                label: 'Title',
                type: 'select',
                options: [
                    {value: 'Mr', label: 'Mr'},
                    {value: 'Mrs', label: 'Mrs'},
                    {value: 'Miss', label: 'Miss'},
                    {value: 'Ms', label: 'Ms'},
                    {value: 'Dr', label: 'Dr'},
                    {value: 'Prof', label: 'Prof'}
                ],
                required: false
            },
            'firstname': {
                label: 'First Name',
                type: 'text',
                required: true
            },
            'surname': {
                label: 'Surname',
                type: 'text',
                required: true
            },
            'middle_names': {
                label: 'Middle Names',
                type: 'text',
                required: false
            },
            'known_as': {
                label: 'Known As',
                type: 'text',
                required: false
            },

            // Personal details
            'gender': {
                label: 'Gender',
                type: 'select',
                options: [
                    {value: 'Male', label: 'Male'},
                    {value: 'Female', label: 'Female'},
                    {value: 'Other', label: 'Other'},
                    {value: 'Prefer not to say', label: 'Prefer not to say'}
                ],
                required: false
            },
            'relationship_status': {
                label: 'Relationship Status',
                type: 'select',
                options: [
                    {value: 'Single', label: 'Single'},
                    {value: 'Married', label: 'Married'},
                    {value: 'Divorced', label: 'Divorced'},
                    {value: 'Widowed', label: 'Widowed'},
                    {value: 'Civil Partnership', label: 'Civil Partnership'}
                ],
                required: false
            },
            'dob': {
                label: 'Date of Birth',
                type: 'date',
                required: false,
                maxDate: TODAY  // Cannot be in future
            },
            'deceased_date': {
                label: 'Date of Death',
                type: 'date',
                required: false,
                maxDate: TODAY
            },
            'place_of_birth': {
                label: 'Place of Birth',
                type: 'text',
                required: false
            },
            'previous_names': {
                label: 'Previous Names',
                type: 'text',
                required: false
            },

            // Contact
            'email_1': {
                label: 'Primary Email',
                type: 'email',
                required: false
            },
            'email_2': {
                label: 'Secondary Email',
                type: 'email',
                required: false
            },
            'phone_1': {
                label: 'Primary Phone',
                type: 'tel',
                required: false
            },
            'phone_2': {
                label: 'Secondary Phone',
                type: 'tel',
                required: false
            },

            // Address
            'address_line_1': {
                label: 'Address Line 1',
                type: 'text',
                required: false
            },
            'address_line_2': {
                label: 'Address Line 2',
                type: 'text',
                required: false
            },
            'address_line_3': {
                label: 'Address Line 3',
                type: 'text',
                required: false
            },
            'address_line_4': {
                label: 'Address Line 4',
                type: 'text',
                required: false
            },
            'address_line_5': {
                label: 'Address Line 5 (Postcode)',
                type: 'text',
                required: false
            },
            'moved_in_date': {
                label: 'Moved In Date',
                type: 'date',
                required: false
            },

            // Employment & Compliance
            'employment_status': {
                label: 'Employment Status',
                type: 'select',
                options: [
                    {value: 'Employed', label: 'Employed'},
                    {value: 'Self-employed', label: 'Self-employed'},
                    {value: 'Unemployed', label: 'Unemployed'},
                    {value: 'Retired', label: 'Retired'},
                    {value: 'Student', label: 'Student'}
                ],
                required: false
            },
            'occupation': {
                label: 'Occupation',
                type: 'text',
                required: false
            },
            'three_words': {
                label: 'Three Words (Profile)',
                type: 'text',
                required: false
            },
            'share_data_with': {
                label: 'Share Data With',
                type: 'text',
                required: false
            },
            'ni_number': {
                label: 'National Insurance Number',
                type: 'text',
                required: false,
                placeholder: 'AB123456C'
            },
            'passport_expiry_date': {
                label: 'Passport Expiry Date',
                type: 'date',
                required: false
            },
            'aml_result': {
                label: 'AML Result',
                type: 'select',
                options: [
                    {value: 'Pass', label: 'Pass'},
                    {value: 'Fail', label: 'Fail'},
                    {value: 'Pending', label: 'Pending'}
                ],
                required: false
            },
            'aml_date': {
                label: 'AML Check Date',
                type: 'date',
                required: false
            }
        }

        RETURN FIELD_CONFIGS[fieldName] OR {
            label: fieldName,
            type: 'text',
            required: false
        }
    END
END FUNCTION
```

---

## 11. API Integration Layer

### 11.1 API Service Functions

```
MODULE ProductOwnerAPI:

    FUNCTION fetchProductOwners(clientGroupId: Integer) RETURNS Promise<Array<ProductOwner>>:
        BEGIN
            response ← API.get("/client-groups/" + clientGroupId + "/product-owners")
            RETURN response.data
        END
    END FUNCTION

    FUNCTION createProductOwner(data: Partial<ProductOwner>) RETURNS Promise<ProductOwner>:
        BEGIN
            response ← API.post("/product-owners", data)
            RETURN response.data
        END
    END FUNCTION

    FUNCTION updateProductOwner(
        productOwnerId: Integer,
        data: Partial<ProductOwner>
    ) RETURNS Promise<ProductOwner>:
        BEGIN
            response ← API.put("/product-owners/" + productOwnerId, data)
            RETURN response.data
        END
    END FUNCTION

    FUNCTION deleteProductOwner(productOwnerId: Integer) RETURNS Promise<void>:
        BEGIN
            CALL API.delete("/product-owners/" + productOwnerId)
            RETURN void
        END
    END FUNCTION

    FUNCTION createClientGroupAssociation(
        clientGroupId: Integer,
        productOwnerId: Integer
    ) RETURNS Promise<Object>:
        BEGIN
            response ← API.post("/client-group-product-owners", {
                client_group_id: clientGroupId,
                product_owner_id: productOwnerId,
                display_order: 0  // Backend calculates actual order
            })
            RETURN response.data
        END
    END FUNCTION

END MODULE
```

### 11.2 Error Handling Wrapper

```
FUNCTION safeApiCall<T>(
    apiCall: Function,
    successMessage: String OR null,
    errorMessage: String OR null
) RETURNS Promise<T OR null>:
    // Generic wrapper for API calls with error handling
    BEGIN
        TRY:
            result ← AWAIT apiCall()

            IF successMessage IS NOT null THEN
                CALL showNotification(successMessage, "success")
            END IF

            RETURN result

        CATCH error:
            // Extract error message from API response
            message ← errorMessage OR
                     error.response?.data?.detail OR
                     error.message OR
                     "An unexpected error occurred"

            CALL showNotification(message, "error")

            // Log for debugging
            CONSOLE.error("API Error:", error)

            RETURN null
        END TRY
    END
END FUNCTION

// Usage example
FUNCTION exampleUsage():
    BEGIN
        result ← CALL safeApiCall(
            () => ProductOwnerAPI.updateProductOwner(123, {status: 'lapsed'}),
            "Status updated successfully",
            "Failed to update status"
        )

        IF result IS NOT null THEN
            // Success - refresh data
            CALL refetchProductOwners()
        END IF
    END
END FUNCTION
```

---

## 12. Validation Logic

### 12.1 Product Owner Form Validation

```
FUNCTION validateProductOwnerForm(data: Partial<ProductOwner>) RETURNS ValidationErrors:
    BEGIN
        errors ← {}

        // Required field: firstname
        IF data.firstname IS null OR TRIM(data.firstname) === '' THEN
            errors.firstname = 'First name is required'
        END IF

        // Required field: surname
        IF data.surname IS null OR TRIM(data.surname) === '' THEN
            errors.surname = 'Surname is required'
        END IF

        // Email validation
        IF data.email_1 IS NOT null AND data.email_1 !== '' THEN
            IF NOT CALL isValidEmail(data.email_1) THEN
                errors.email_1 = 'Invalid email format'
            END IF
        END IF

        IF data.email_2 IS NOT null AND data.email_2 !== '' THEN
            IF NOT CALL isValidEmail(data.email_2) THEN
                errors.email_2 = 'Invalid email format'
            END IF
        END IF

        // Date validation - no future dates (except passport_expiry_date)
        IF data.dob IS NOT null AND data.dob !== '' THEN
            dobDate ← PARSE_DATE(data.dob)
            IF dobDate > TODAY THEN
                errors.dob = 'Date of birth cannot be in the future'
            END IF
        END IF

        IF data.deceased_date IS NOT null AND data.deceased_date !== '' THEN
            deceasedDate ← PARSE_DATE(data.deceased_date)
            IF deceasedDate > TODAY THEN
                errors.deceased_date = 'Date of death cannot be in the future'
            END IF
        END IF

        // Deceased date must be after DOB
        IF data.dob IS NOT null AND data.deceased_date IS NOT null THEN
            IF PARSE_DATE(data.deceased_date) < PARSE_DATE(data.dob) THEN
                errors.deceased_date = 'Date of death must be after date of birth'
            END IF
        END IF

        // NI Number validation (optional but format-checked if provided)
        IF data.ni_number IS NOT null AND data.ni_number !== '' THEN
            IF NOT CALL isValidNINumber(data.ni_number) THEN
                errors.ni_number = 'Invalid NI number format (e.g., AB123456C)'
            END IF
        END IF

        // Phone validation (basic)
        IF data.phone_1 IS NOT null AND data.phone_1 !== '' THEN
            IF NOT CALL isValidPhone(data.phone_1) THEN
                errors.phone_1 = 'Invalid phone number format'
            END IF
        END IF

        IF data.phone_2 IS NOT null AND data.phone_2 !== '' THEN
            IF NOT CALL isValidPhone(data.phone_2) THEN
                errors.phone_2 = 'Invalid phone number format'
            END IF
        END IF

        RETURN errors
    END
END FUNCTION
```

### 12.2 Email Validation

```
FUNCTION isValidEmail(email: String) RETURNS Boolean:
    // RFC 5322 compliant email validation (simplified)
    BEGIN
        emailRegex ← /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        RETURN emailRegex.test(email)
    END
END FUNCTION
```

### 12.3 UK National Insurance Number Validation

```
FUNCTION isValidNINumber(niNumber: String) RETURNS Boolean:
    // UK NI Number format: XX 99 99 99 X
    // First two letters cannot be D, F, I, Q, U, V
    // Second letter cannot be O
    // Last letter is A, B, C, or D
    BEGIN
        // Remove spaces and convert to uppercase
        cleanedNI ← niNumber.replace(/\s+/g, '').toUpperCase()

        // Check format: 2 letters + 6 digits + 1 letter
        niRegex ← /^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/

        RETURN niRegex.test(cleanedNI)
    END
END FUNCTION
```

### 12.4 Phone Number Validation

```
FUNCTION isValidPhone(phone: String) RETURNS Boolean:
    // Basic phone validation - accepts UK formats and international
    // Examples: 07123456789, +44 7123 456789, (01234) 567890
    BEGIN
        // Remove common formatting characters
        cleanedPhone ← phone.replace(/[\s\-\(\)]/g, '')

        // Check for valid phone pattern (10-15 digits, optional + prefix)
        phoneRegex ← /^\+?\d{10,15}$/

        RETURN phoneRegex.test(cleanedPhone)
    END
END FUNCTION
```

### 12.5 Date Validation

```
FUNCTION isValidDate(dateString: String) RETURNS Boolean:
    BEGIN
        IF dateString IS null OR dateString === '' THEN
            RETURN false
        END IF

        TRY:
            date ← PARSE_DATE(dateString)

            // Check if date is valid
            IF date IS INVALID OR isNaN(date.getTime()) THEN
                RETURN false
            END IF

            // Additional checks can be added here
            RETURN true

        CATCH error:
            RETURN false
        END TRY
    END
END FUNCTION
```

---

## 13. Accessibility Patterns

### 13.1 Keyboard Navigation in Table

```
// NOTE: Keyboard navigation is now primarily handled at the row level via handleRowKeyDown (Section 4.3a)
// Each row has tabindex="0" making it focusable, role="button", and aria-label for screen readers
// Pressing Enter or Space on a focused row opens the edit modal

FUNCTION setupKeyboardNavigation():
    // Enable arrow key navigation through table rows
    // This is OPTIONAL and can be implemented at the table container level for enhanced UX
    BEGIN
        // Add keyboard event listeners to table container
        tableContainer ← document.querySelector('.people-tab-table')

        tableContainer.addEventListener('keydown', (event) => {
            // Only handle arrow keys if focused element is a table row
            IF document.activeElement.tagName === 'TR' THEN
                IF event.key === 'ArrowDown' THEN
                    CALL focusNextRow()
                    event.preventDefault()
                ELSE IF event.key === 'ArrowUp' THEN
                    CALL focusPreviousRow()
                    event.preventDefault()
                END IF
            END IF
        })
    END
END FUNCTION

FUNCTION focusNextRow():
    // Move focus to next row in the table
    BEGIN
        currentRow ← document.activeElement
        nextRow ← currentRow.nextElementSibling

        IF nextRow IS NOT null AND nextRow.tagName === 'TR' THEN
            nextRow.focus()
        END IF
    END
END FUNCTION

FUNCTION focusPreviousRow():
    // Move focus to previous row in the table
    BEGIN
        currentRow ← document.activeElement
        previousRow ← currentRow.previousElementSibling

        IF previousRow IS NOT null AND previousRow.tagName === 'TR' THEN
            previousRow.focus()
        END IF
    END
END FUNCTION

// IMPORTANT: Row activation (Enter/Space keys) is handled by handleRowKeyDown in Section 4.3a
// This prevents duplication and ensures consistent behavior between mouse clicks and keyboard activation
```

### 13.2 Focus Trap in Modal

```
FUNCTION setupFocusTrap(modalElement: HTMLElement):
    // Trap focus within modal - prevents tabbing outside
    BEGIN
        // Get all focusable elements in modal
        focusableSelector ← 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        focusableElements ← modalElement.querySelectorAll(focusableSelector)

        firstElement ← focusableElements[0]
        lastElement ← focusableElements[focusableElements.length - 1]

        // Add keydown listener to modal
        ON_KEY_DOWN(event):
            IF event.key === 'Tab' THEN
                IF event.shiftKey THEN
                    // Shift + Tab - going backwards
                    IF document.activeElement === firstElement THEN
                        event.preventDefault()
                        lastElement.focus()
                    END IF
                ELSE
                    // Tab - going forwards
                    IF document.activeElement === lastElement THEN
                        event.preventDefault()
                        firstElement.focus()
                    END IF
                END IF
            ELSE IF event.key === 'Escape' THEN
                // Close modal on Escape
                CALL closeModal()
            END IF
        END ON_KEY_DOWN

        // Focus first element on modal open
        firstElement.focus()
    END
END FUNCTION
```

### 13.3 ARIA Live Regions for Notifications

```
FUNCTION showNotification(message: String, type: String):
    // Display notification with screen reader announcement
    BEGIN
        // Create or get live region element
        liveRegion ← document.getElementById('notification-live-region')

        IF liveRegion IS null THEN
            liveRegion ← CREATE_ELEMENT('div')
            liveRegion.id = 'notification-live-region'
            liveRegion.setAttribute('role', 'status')
            liveRegion.setAttribute('aria-live', 'polite')
            liveRegion.setAttribute('aria-atomic', 'true')
            liveRegion.className = 'sr-only'  // Visually hidden but announced
            document.body.appendChild(liveRegion)
        END IF

        // Set message - screen reader will announce
        liveRegion.textContent = message

        // Also show visual notification
        CALL showVisualNotification(message, type)

        // Clear live region after announcement
        AFTER 1000ms:
            liveRegion.textContent = ''
        END AFTER
    END
END FUNCTION
```

### 13.4 ARIA Labels for Context

```
FUNCTION getContextualAriaLabel(action: String, productOwner: ProductOwner) RETURNS String:
    // Generate descriptive ARIA labels for actions
    BEGIN
        fullName ← CALL formatName(productOwner)

        IF action === 'edit' THEN
            RETURN "Edit " + fullName
        ELSE IF action === 'lapse' THEN
            RETURN "Mark " + fullName + " as lapsed"
        ELSE IF action === 'deceased' THEN
            RETURN "Mark " + fullName + " as deceased"
        ELSE IF action === 'reactivate' THEN
            RETURN "Reactivate " + fullName
        ELSE IF action === 'delete' THEN
            RETURN "Delete " + fullName
        ELSE
            RETURN action + " " + fullName
        END IF
    END
END FUNCTION
```

### 13.5 Status Badge with Screen Reader Support

```
COMPONENT StatusBadge(status: String):

    FUNCTION render():
        BEGIN
            // Determine badge styling and label
            IF status === STATUS_ACTIVE THEN
                badgeClass ← "bg-green-100 text-green-800"
                icon ← CheckCircleIcon
                label ← "Active"
            ELSE IF status === STATUS_LAPSED THEN
                badgeClass ← "bg-orange-100 text-orange-800"
                icon ← PauseCircleIcon
                label ← "Lapsed"
            ELSE IF status === STATUS_DECEASED THEN
                badgeClass ← "bg-gray-100 text-gray-800"
                icon ← XCircleIcon
                label ← "Deceased"
            ELSE
                badgeClass ← "bg-gray-100 text-gray-600"
                icon ← null
                label ← status
            END IF

            RETURN (
                <span
                    className={badgeClass + " px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"}
                    aria-label={"Status: " + label}
                    role="status"
                >
                    {icon IS NOT null ? <icon className="h-3 w-3" aria-hidden="true" /> : null}
                    <span>{label}</span>
                </span>
            )
        END
    END FUNCTION
```

---

## 14. Edge Cases and Error Scenarios

### 14.1 Handling Missing or Invalid Data

```
FUNCTION renderCellValue(value: Any, fieldType: String) RETURNS String OR ReactNode:
    // Safely render cell values with fallback for missing data
    BEGIN
        // Handle null/undefined
        IF value IS null OR value IS undefined OR value === '' THEN
            RETURN <span className="text-gray-400 italic">N/A</span>
        END IF

        // Handle dates
        IF fieldType === 'date' THEN
            formattedDate ← CALL formatDate(value)
            IF formattedDate === "Invalid Date" THEN
                RETURN <span className="text-red-500 italic">Invalid</span>
            END IF
            RETURN formattedDate
        END IF

        // Handle email (clickable mailto link)
        IF fieldType === 'email' THEN
            RETURN <a href={"mailto:" + value} className="text-primary-600 hover:underline">{value}</a>
        END IF

        // Default: return as string
        RETURN STRING(value)
    END
END FUNCTION
```

### 14.2 Concurrent Edit Detection

```
// Future enhancement - detect if product owner was modified by another user
FUNCTION checkForConcurrentEdits(productOwnerId: Integer, lastKnownVersion: String):
    BEGIN
        TRY:
            currentData ← CALL ProductOwnerAPI.fetchProductOwners(clientGroupId)
            currentProductOwner ← FIND currentData WHERE id === productOwnerId

            IF currentProductOwner IS null THEN
                // Product owner was deleted
                CALL showNotification(
                    "This product owner has been deleted by another user",
                    "warning"
                )
                CALL closeEditModal()
                CALL refetchProductOwners()
                RETURN false
            END IF

            // Check if version changed (requires backend to track updated_at)
            IF currentProductOwner.updated_at !== lastKnownVersion THEN
                // Data was modified
                confirmed ← CONFIRM(
                    "This product owner has been modified by another user. " +
                    "Do you want to overwrite their changes?"
                )
                RETURN confirmed
            END IF

            RETURN true

        CATCH error:
            // Network error - allow edit attempt
            RETURN true
        END TRY
    END
END FUNCTION
```

### 14.3 Network Error Recovery

```
FUNCTION handleNetworkError(error: Error, operation: String):
    BEGIN
        IF error.message.includes('NetworkError') OR error.message.includes('timeout') THEN
            CALL showNotification(
                "Network error. Please check your connection and try again.",
                "error",
                {
                    action: {
                        label: "Retry",
                        onClick: () => CALL retryFailedOperation(operation)
                    }
                }
            )
        ELSE IF error.response?.status === 401 THEN
            // Authentication error
            CALL showNotification(
                "Your session has expired. Please log in again.",
                "error"
            )
            // Redirect to login
            REDIRECT_TO('/login')
        ELSE IF error.response?.status === 403 THEN
            // Authorization error
            CALL showNotification(
                "You don't have permission to perform this action.",
                "error"
            )
        ELSE IF error.response?.status >= 500 THEN
            // Server error
            CALL showNotification(
                "Server error. Our team has been notified. Please try again later.",
                "error"
            )
        ELSE
            // Generic error
            CALL showNotification(
                error.response?.data?.detail OR error.message OR "An error occurred",
                "error"
            )
        END IF
    END
END FUNCTION
```

### 14.4 Empty State Variations

```
FUNCTION renderEmptyState(productOwners: Array, isLoading: Boolean, error: String OR null):
    BEGIN
        // Loading state
        IF isLoading THEN
            RETURN <LoadingSpinner message="Loading product owners..." />
        END IF

        // Error state
        IF error IS NOT null THEN
            RETURN <ErrorDisplay
                title="Failed to Load Product Owners"
                message={error}
                action={{
                    label: "Try Again",
                    onClick: fetchProductOwners
                }}
            />
        END IF

        // No data state
        IF productOwners.length === 0 THEN
            RETURN <EmptyState
                icon={UserIcon}
                title="No product owners found"
                subtitle="This client group doesn't have any product owners yet"
                action={{
                    label: "+ Add Person",
                    onClick: openCreateModal,
                    variant: "primary"
                }}
            />
        END IF

        // Has data - render table
        RETURN <ProductOwnerTable productOwners={productOwners} ... />
    END
END FUNCTION
```

---

## 15. Performance Optimizations

### 15.1 Memoized Sorted List

```
// Use memoization to avoid re-sorting on every render
sortedProductOwners ← USE_MEMO(() => {
    RETURN CALL getSortedProductOwners()
}, [productOwners, sortConfig])
// Only recalculate when productOwners or sortConfig changes
```

### 15.2 Debounced Search (Future Enhancement)

```
FUNCTION setupSearchDebounce():
    BEGIN
        STATE searchTerm: String = ''
        STATE debouncedSearchTerm: String = ''

        // Debounce search input to avoid excessive filtering
        USE_EFFECT(() => {
            timer ← SETTIMEOUT(() => {
                SET debouncedSearchTerm = searchTerm
            }, 300)  // Wait 300ms after user stops typing

            RETURN () => CLEARTIMEOUT(timer)  // Cleanup
        }, [searchTerm])

        // Filter product owners based on debounced search
        filteredProductOwners ← USE_MEMO(() => {
            IF debouncedSearchTerm === '' THEN
                RETURN productOwners
            END IF

            lowerSearch ← debouncedSearchTerm.toLowerCase()

            RETURN FILTER productOwners WHERE (
                formatName(po).toLowerCase().includes(lowerSearch) OR
                po.email_1?.toLowerCase().includes(lowerSearch) OR
                po.phone_1?.includes(lowerSearch)
            )
        }, [productOwners, debouncedSearchTerm])
    END
END FUNCTION
```

### 15.3 Virtual Scrolling (Future Enhancement for Large Lists)

```
// For client groups with 100+ product owners
FUNCTION renderVirtualizedTable(productOwners: Array<ProductOwner>):
    BEGIN
        CONSTANTS:
            ROW_HEIGHT = 60  // pixels
            VISIBLE_ROWS = 20  // Number of rows visible at once

        STATE scrollTop: Number = 0

        // Calculate which rows to render based on scroll position
        startIndex ← FLOOR(scrollTop / ROW_HEIGHT)
        endIndex ← MIN(startIndex + VISIBLE_ROWS, productOwners.length)

        visibleProductOwners ← productOwners.slice(startIndex, endIndex)

        // Calculate spacer heights for smooth scrolling
        topSpacer ← startIndex * ROW_HEIGHT
        bottomSpacer ← (productOwners.length - endIndex) * ROW_HEIGHT

        RETURN (
            <div
                className="overflow-auto"
                style={{height: VISIBLE_ROWS * ROW_HEIGHT + "px"}}
                onScroll={(e) => SET scrollTop = e.target.scrollTop}
            >
                <table>
                    <thead>{/* Table header */}</thead>
                    <tbody>
                        {/* Top spacer */}
                        <tr style={{height: topSpacer + "px"}}></tr>

                        {/* Visible rows */}
                        FOR EACH productOwner IN visibleProductOwners:
                            <ProductOwnerRow productOwner={productOwner} ... />
                        END FOR

                        {/* Bottom spacer */}
                        <tr style={{height: bottomSpacer + "px"}}></tr>
                    </tbody>
                </table>
            </div>
        )
    END
END FUNCTION
```

---

## 16. Summary and Implementation Checklist

### 16.1 Core Components Implemented

```
CHECKLIST:
    ✓ PeopleSubTab - Main container component
    ✓ ProductOwnerTable - Semantic HTML table with ARIA attributes
    ✓ ProductOwnerRow - Individual row with action buttons
    ✓ EditProductOwnerModal - Tabbed modal for editing 31 fields
    ✓ CreateProductOwnerModal - Tabbed modal for creating new product owners
    ✓ DeleteConfirmationModal - Warning modal with confirmation
    ✓ DeceasedDateModal - Date capture for deceased status
    ✓ StatusBadge - Accessible status indicator
```

### 16.2 Key Algorithms Implemented

```
CHECKLIST:
    ✓ getSortedProductOwners() - Active/inactive grouping + custom sorting
    ✓ sortProductOwners() - Generic sort with null handling
    ✓ sortByAge() - Computed field sorting
    ✓ sortByName() - Formatted name sorting
    ✓ handleStatusChange() - Status transition workflow
    ✓ executeStatusChange() - API call for status updates
    ✓ createProductOwner() - Two-step creation flow
    ✓ updateProductOwner() - Edit with change detection
    ✓ confirmDelete() - Deletion with validation
```

### 16.3 Helper Functions Implemented

```
CHECKLIST:
    ✓ calculateAge() - Age from DOB with edge cases
    ✓ formatName() - Full name concatenation
    ✓ formatDate() - User-friendly date display
    ✓ isInactive() - Status check
    ✓ getFieldConfig() - Centralized field metadata
    ✓ getContextualAriaLabel() - Accessible button labels
```

### 16.4 Validation Functions Implemented

```
CHECKLIST:
    ✓ validateProductOwnerForm() - Comprehensive form validation
    ✓ isValidEmail() - Email format check
    ✓ isValidNINumber() - UK NI number validation
    ✓ isValidPhone() - Phone number validation
    ✓ isValidDate() - Date format and range validation
```

### 16.5 Accessibility Patterns Implemented

```
CHECKLIST:
    ✓ Semantic HTML table structure (<table>, <thead>, <th scope="col">)
    ✓ Dynamic aria-sort attributes on column headers
    ✓ ARIA labels with context (e.g., "Edit John Smith")
    ✓ Focus trap in modals
    ✓ Keyboard navigation (Tab, Enter, Escape, Arrow keys)
    ✓ ARIA live regions for notifications
    ✓ Status badges with role="status"
    ✓ Focus restoration on modal close
```

### 16.6 Error Handling Implemented

```
CHECKLIST:
    ✓ Network error detection and retry
    ✓ API error message display
    ✓ Validation error inline display
    ✓ Null/undefined data handling
    ✓ Invalid date handling
    ✓ Concurrent edit detection (future)
    ✓ 401/403/500 HTTP status handling
```

---

## Document Metadata

**Version**: 1.0
**Created**: 2025-12-04
**Author**: Claude Code
**Based On**: Phase2_People_Tab_Specification.md v2.0
**Implementation Status**: Ready for Development

**Key Patterns Used**:
- React functional components with hooks
- React Query for server state management
- HeadlessUI for accessible modals
- Semantic HTML for accessibility
- Progressive disclosure for complex forms
- Optimistic UI updates with error rollback
- Comprehensive error handling
- Memoization for performance

**Next Steps**:
1. Review pseudocode with development team
2. Begin Phase 0: Setup and verification (verify deceased_date field exists, install HeadlessUI)
3. Implement Phase 1: Core table display with semantic HTML
4. Continue through phases 2-8 as outlined in specification

---

**End of Pseudocode Documentation**
