# Phase 4: Application Code Updates

## Overview

Phase 4 involves updating the application code to use the new advisor_id foreign key relationships. The database work is complete, now we need to update the API and frontend to take advantage of the new advisor profile relationships.

## Current Status

✅ **Database Schema Complete** - advisor_id column added  
✅ **Data Migration Complete** - Debbie and Jan mapped to profiles  
✅ **Database Views Updated** - Views include advisor names from profiles  
✅ **Search Updated** - Global search works with advisor profiles

## Phase 4 Objectives

### Backend Updates Required:
1. **Update Pydantic Models** - Include advisor_id and advisor_name fields
2. **Update API Routes** - Use advisor relationships in responses  
3. **Update Bulk Endpoints** - Include advisor data from new views
4. **Update Search Routes** - Leverage updated search functionality
5. **Add Advisor Management** - New endpoints for advisor assignment

### Frontend Updates Required:
1. **Update Display Logic** - Show advisor names instead of text  
2. **Add Advisor Selection** - Dropdowns for advisor assignment
3. **Update Search Results** - Handle new advisor entity type
4. **Minimal Changes** - Most changes are display-only

## Backend Code Updates

### 1. Pydantic Model Updates

**File: `backend/app/models/client_group.py`**
```python
# Current model needs updating
class ClientGroupBase(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    advisor: Optional[str] = Field(default=None)  # ← LEGACY FIELD

# Updated model with advisor relationship
class ClientGroupBase(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    advisor_id: Optional[int] = Field(default=None)  # ← NEW FK FIELD

class ClientGroup(ClientGroupBase):
    id: int
    created_at: datetime
    advisor_id: Optional[int] = None
    # Computed fields from views
    advisor_name: Optional[str] = None
    advisor_email: Optional[str] = None
    advisor_first_name: Optional[str] = None
    advisor_last_name: Optional[str] = None
    # Keep legacy field during transition
    legacy_advisor_text: Optional[str] = None
```

**File: `backend/app/models/client.py`**
```python
# Similar updates needed for backward compatibility
```

### 2. API Route Updates

**File: `backend/app/api/routes/client_groups.py`**

**Current bulk endpoint:**
```python
@router.get("/bulk_client_data")
async def get_bulk_client_data(db = Depends(get_db)):
    # Currently uses: cg.advisor (text field)
    # Needs to use: advisor_name from client_group_complete_data view
```

**Updated bulk endpoint:**
```python
@router.get("/bulk_client_data")
async def get_bulk_client_data(db = Depends(get_db)):
    query = """
    SELECT 
        client_group_id,
        client_group_name,
        advisor_id,
        advisor_name,
        advisor_email,
        advisor_first_name,
        advisor_last_name,
        legacy_advisor_text,
        advisor_assignment_status,
        -- ... other fields
    FROM client_group_complete_data
    WHERE client_group_status != 'inactive'
    ORDER BY client_group_name
    """
    
    # Response now includes advisor profile information
    return [{
        "id": row["client_group_id"],
        "name": row["client_group_name"],
        "advisor_id": row["advisor_id"],
        "advisor_name": row["advisor_name"],
        "advisor_email": row["advisor_email"],
        "advisor": row["legacy_advisor_text"],  # Keep for transition
        # ... other fields
    } for row in results]
```

**New advisor management endpoints:**
```python
@router.get("/advisors")
async def get_available_advisors(db = Depends(get_db)):
    """Get list of available advisors for assignment"""
    query = "SELECT * FROM advisor_client_summary ORDER BY full_name"
    # Return advisor options for dropdowns

@router.put("/{client_group_id}/advisor")
async def assign_advisor(
    client_group_id: int, 
    advisor_id: Optional[int] = None,
    db = Depends(get_db)
):
    """Assign or unassign advisor to client group"""
    # Update client_groups.advisor_id
    # Return updated client group with advisor information
```

### 3. Search Route Updates

**File: `backend/app/api/routes/search.py`**
```python
@router.get("/global_search")
async def global_search_endpoint(q: str, db = Depends(get_db)):
    # Now uses updated global_search() function
    # Returns advisor entities and enhanced client/product results
```

### 4. Analytics Updates

**File: `backend/app/api/routes/analytics.py`**
```python
# Update analytics to include advisor-based reporting
# Add advisor performance metrics
# Update client analytics to include advisor information
```

## Frontend Code Updates

### 1. Display Logic Updates

**Files needing updates:**
- Components that display client information
- Client listing tables  
- Client detail pages
- Search results

**Example update:**
```typescript
// Before: Using advisor text field
<span>{client.advisor}</span>

// After: Using advisor profile information
<span>{client.advisor_name || client.advisor || 'No Advisor'}</span>

// Or with email:
<span>
  {client.advisor_name && (
    <>
      {client.advisor_name}
      {client.advisor_email && (
        <small className="text-gray-600">({client.advisor_email})</small>
      )}
    </>
  )}
</span>
```

### 2. Advisor Selection Components

**New component needed:**
```typescript
// AdvisorSelect.tsx
interface AdvisorSelectProps {
  value?: number;
  onChange: (advisorId: number | null) => void;
  allowClear?: boolean;
}

export const AdvisorSelect: React.FC<AdvisorSelectProps> = ({
  value,
  onChange,
  allowClear = true
}) => {
  const { data: advisors } = useQuery(['advisors'], fetchAvailableAdvisors);
  
  return (
    <SearchableDropdown
      options={advisors?.map(advisor => ({
        value: advisor.advisor_id,
        label: `${advisor.full_name} (${advisor.email})`
      }))}
      value={value}
      onChange={onChange}
      placeholder="Select advisor..."
      allowClear={allowClear}
    />
  );
};
```

### 3. Search Results Updates

**Update search results to handle advisor entities:**
```typescript
// Handle new "advisor" entity type in search results
const renderSearchResult = (result: SearchResult) => {
  switch (result.entity_type) {
    case 'client_group':
      // Show advisor information in client results
      break;
    case 'advisor':  // ← NEW ENTITY TYPE
      // Show advisor profile with client count
      break;
    case 'product':
      // Show enhanced product results with advisor info
      break;
  }
};
```

## Implementation Priority

### High Priority (Core Functionality):
1. **Backend bulk endpoints** - Update to use advisor_name from views
2. **Client display components** - Show advisor names instead of text
3. **Pydantic models** - Include advisor_id fields

### Medium Priority (Enhanced Features):
1. **Advisor selection** - Add advisor assignment functionality
2. **Search enhancements** - Support advisor entity searches
3. **Analytics updates** - Advisor-based reporting

### Low Priority (Polish):
1. **UI refinements** - Improved advisor display formatting
2. **Advanced features** - Advisor workload dashboards
3. **Mobile optimization** - Advisor information in mobile views

## Testing Strategy

### 1. Backend Testing:
```python
# Test advisor_id fields in API responses
def test_bulk_client_data_includes_advisor():
    response = client.get("/api/client_groups/bulk_client_data")
    assert "advisor_id" in response.json()[0]
    assert "advisor_name" in response.json()[0]

# Test advisor assignment
def test_assign_advisor():
    response = client.put("/api/client_groups/1/advisor", json={"advisor_id": 5})
    assert response.status_code == 200
```

### 2. Frontend Testing:
```typescript
// Test advisor display
test('displays advisor name when available', () => {
  const client = { advisor_name: 'John Smith', advisor_email: 'john@example.com' };
  render(<ClientCard client={client} />);
  expect(screen.getByText('John Smith')).toBeInTheDocument();
});

// Test advisor selection
test('advisor selection updates client', () => {
  // Test advisor dropdown functionality
});
```

## Migration Timeline

### Week 1: Backend Updates
- [ ] Update Pydantic models
- [ ] Update bulk data endpoints
- [ ] Add advisor management endpoints
- [ ] Test API changes

### Week 2: Frontend Updates  
- [ ] Update client display components
- [ ] Add advisor selection functionality
- [ ] Update search results handling
- [ ] Test UI changes

### Week 3: Integration & Polish
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] UI/UX refinements
- [ ] Documentation updates

## Rollback Strategy

If issues arise during Phase 4:
1. **Database rollback** not needed - views support both old and new fields
2. **API rollback** - Can revert to using legacy_advisor_text temporarily  
3. **Frontend rollback** - Can fall back to advisor text display
4. **Gradual deployment** - Can deploy backend and frontend changes separately

## Success Criteria

Phase 4 is complete when:
- ✅ Client listings show advisor names from profiles
- ✅ Advisor assignment functionality works
- ✅ Search includes advisor entities
- ✅ All existing functionality preserved
- ✅ Performance maintained or improved
- ✅ Comprehensive test coverage

## Expected Benefits

### For Users:
- **Clear advisor visibility** - See full advisor names and emails
- **Easy advisor management** - Assign/reassign advisors easily
- **Better search** - Find clients by advisor name
- **Consistent data** - Advisor information always up-to-date

### For Developers:
- **Referential integrity** - Foreign key constraints prevent invalid data
- **Better performance** - Optimized queries with proper joins
- **Extensible architecture** - Easy to add advisor-based features
- **Type safety** - TypeScript interfaces ensure data consistency

---

**Phase 4 completes the advisor field migration by making the new relationships fully functional in the application interface.** 