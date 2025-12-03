# Client Group Suite

The **Client Group Suite** is a comprehensive hub for managing all aspects of a client group in Kingston's Portal.

## Overview

This is a single-page application within the main app that provides centralized access to all client group information and activities through a tabbed interface.

## Structure

```
ClientGroupSuite/
├── index.tsx                 # Main suite component with tab navigation
├── types.ts                  # TypeScript type definitions
├── sampleData.ts            # Mock data for development
├── README.md                # This file
└── tabs/                    # Tab components
    ├── OverviewTab.tsx      # Summary and key metrics
    ├── PeopleTab.tsx        # Product owners management
    ├── ProductsTab.tsx      # Financial products
    ├── ActivitiesTab.tsx    # Activity timeline
    ├── MeetingsTab.tsx      # Meetings and appointments
    └── SettingsTab.tsx      # Client group settings
```

## Routing

The suite is accessible at:
```
/client-groups/:clientGroupId/suite
```

Example:
```
http://localhost:3000/client-groups/141/suite
```

## Tabs

### 1. Overview Tab
**Purpose**: High-level summary of the client group

**Features** (to be implemented):
- Client group details (name, type, status)
- Key metrics dashboard (FUM, number of products, number of people)
- Quick actions (add product owner, create product, schedule meeting)
- Recent activity summary
- Important alerts and notifications

### 2. People Tab
**Purpose**: Manage product owners (people in the client group)

**Features** (to be implemented):
- List of all product owners
- Add/edit/remove product owners
- Personal details (name, contact info, DOB, address)
- Relationship tracking
- Document management (IDs, passports, etc.)

### 3. Products Tab
**Purpose**: Financial products and portfolio management

**Features** (to be implemented):
- List of all products for this client group
- Product cards with key info (provider, value, performance)
- Portfolio composition view
- Performance charts (IRR, growth over time)
- Add/edit products
- Link to detailed product pages

### 4. Activities Tab
**Purpose**: Complete activity history and timeline

**Features** (to be implemented):
- Chronological timeline of all activities
- Transaction history (investments, withdrawals, switches)
- Document uploads and changes
- System events and audit trail
- Filter by type, date range, person
- Export capabilities

### 5. Meetings Tab
**Purpose**: Meetings and appointment management

**Features** (to be implemented):
- Calendar view of meetings
- Upcoming meetings list
- Past meetings with notes
- Schedule new meetings
- Annual review tracking
- Meeting types (Annual Review, Mid-Year Check-in, Ad-hoc)
- Integration with advisor calendars (future)

### 6. Settings Tab
**Purpose**: Client group configuration

**Features** (to be implemented):
- Edit client group details (name, type, status)
- Lead advisor assignment
- Fee structure configuration
- Ongoing client settings
- Declaration dates (client, privacy, fee agreement)
- Danger zone (archive/delete client group)

## Architecture Pattern

Based on the Phase 2 Prototype architecture:

### Horizontal Tab Navigation
- Clean, space-efficient navigation
- Clear context switching
- Icon + label for each tab
- Active state highlighting

### Tab Components
- Each tab is a separate component
- Receives `clientGroupId` as prop
- Independent state management
- Can be developed in parallel

### Data Flow (Future)
```typescript
// Current: Static sample data
import { sampleProductOwners } from './sampleData';

// Future: API integration with React Query
const { data: productOwners, isLoading } = useQuery(
  ['clientGroup', clientGroupId, 'productOwners'],
  () => api.get(`/client-groups/${clientGroupId}/product-owners`)
);
```

## Development Workflow

### Adding a New Feature to a Tab

1. **Update types** (`types.ts`):
   ```typescript
   export interface NewFeature {
     id: number;
     name: string;
     // ... other fields
   }
   ```

2. **Add sample data** (`sampleData.ts`):
   ```typescript
   export const sampleNewFeatures: NewFeature[] = [
     { id: 1, name: 'Example' },
   ];
   ```

3. **Implement in tab component** (e.g., `tabs/OverviewTab.tsx`):
   ```typescript
   import { NewFeature } from '../types';
   import { sampleNewFeatures } from '../sampleData';

   const OverviewTab: React.FC<TabProps> = ({ clientGroupId }) => {
     // Render your feature
     return (
       <div>
         {sampleNewFeatures.map(feature => (
           <div key={feature.id}>{feature.name}</div>
         ))}
       </div>
     );
   };
   ```

4. **Connect to API** (when backend is ready):
   ```typescript
   const { data: features } = useQuery(
     ['features', clientGroupId],
     () => api.get(`/client-groups/${clientGroupId}/features`)
   );
   ```

## Navigation

Users can access the Client Group Suite by:
1. Clicking on a client group in the main client groups list
2. From the old ClientDetails page (can add "Open Suite" button)
3. Direct URL navigation

## Testing

To test the suite locally:
1. Start the frontend: `npm start`
2. Navigate to: `http://localhost:3000/client-groups/141/suite`
   (Use any valid client group ID from your database)

## Future Enhancements

- [ ] Real-time updates using WebSockets
- [ ] Advanced search and filtering across all tabs
- [ ] Export data to PDF/Excel
- [ ] Batch operations (bulk updates)
- [ ] Mobile-responsive design
- [ ] Keyboard shortcuts
- [ ] Print-friendly views
- [ ] Integration with external calendar systems
- [ ] Document management system integration

## Related Components

- **CreateClientGroupPrototype**: Creates new client groups
- **ClientDetails**: Legacy client details page (may be replaced)
- **Phase 2 Prototype**: Design inspiration and architectural reference

## API Endpoints (Future)

The suite will integrate with these endpoints:

```
GET    /api/client-groups/:id                    # Client group details
GET    /api/client-groups/:id/product-owners     # List product owners
POST   /api/client-groups/:id/product-owners     # Add product owner
GET    /api/client-groups/:id/products           # List products
GET    /api/client-groups/:id/activities         # Activity timeline
GET    /api/client-groups/:id/meetings           # List meetings
POST   /api/client-groups/:id/meetings           # Schedule meeting
PATCH  /api/client-groups/:id                    # Update client group
```

## Contributing

When adding features to the Client Group Suite:
1. Follow the existing tab structure
2. Use TypeScript for type safety
3. Add sample data for development
4. Document new features in this README
5. Ensure mobile responsiveness
6. Add tests for new functionality

---

**Status**: Skeleton created ✅
**Next Steps**: Implement features for each tab, connect to backend APIs
**Last Updated**: 2025-12-03
