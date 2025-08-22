# Concurrent Features and User Management

## Overview

Kingston's Portal implements **real-time concurrent user features** including presence detection, user activity tracking, and concurrent access notifications. These features enhance collaboration and prevent data conflicts in the multi-user wealth management environment.

## Concurrent User Detection System

### Problem Solved

**Multi-User Environment Challenges**:
- Users editing the same client data simultaneously
- No visibility into who else is viewing/editing records
- Potential data conflicts from concurrent modifications
- Need for collaborative awareness in team environment

### System Architecture

**Database Schema** (PostgreSQL):
```sql
CREATE TABLE user_page_presence (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES profiles(id),
    page_identifier VARCHAR(255),
    last_seen TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, page_identifier)
);

-- Indexes for performance
CREATE INDEX idx_user_page_presence_last_seen ON user_page_presence (last_seen);
CREATE INDEX idx_user_page_presence_page ON user_page_presence (page_identifier);
CREATE INDEX idx_user_page_presence_user_page ON user_page_presence (user_id, page_identifier);
```

**Real-Time Presence Tracking**:
```typescript
// usePresence hook implementation
const usePresence = (pageIdentifier: string) => {
  const [currentUsers, setCurrentUsers] = useState<PresenceUser[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !pageIdentifier) return;

    // Update own presence
    const updatePresence = async () => {
      await api.post('/user_page_presence', {
        page_identifier: pageIdentifier,
        user_id: user.id
      });
    };

    // Fetch current users on page
    const fetchPresence = async () => {
      const response = await api.get(`/user_page_presence/${pageIdentifier}`);
      setCurrentUsers(response.data);
    };

    // Initial presence update
    updatePresence();
    fetchPresence();

    // Regular presence updates (30-second intervals)
    const presenceInterval = setInterval(() => {
      updatePresence();
      fetchPresence();
    }, 30000);

    return () => clearInterval(presenceInterval);
  }, [pageIdentifier, user]);

  return { currentUsers };
};
```

## Presence Indicator System

### Visual Presence Display

**PresenceIndicator Component**:
```typescript
interface PresenceUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  last_seen: string;
}

const PresenceIndicator: React.FC<{
  currentUsers: PresenceUser[];
  showNotifications?: boolean;
  pageContext?: string;
}> = ({ currentUsers, showNotifications = true, pageContext }) => {
  const { user: currentUser } = useAuth();
  
  // Filter out current user from display
  const otherUsers = currentUsers.filter(u => u.id !== currentUser?.id);

  if (otherUsers.length === 0) return null;

  return (
    <div className="presence-indicator">
      <div className="flex items-center space-x-2">
        <div className="flex -space-x-2">
          {otherUsers.slice(0, 3).map((user) => (
            <ProfileAvatar
              key={user.id}
              user={user}
              size="sm"
              className="border-2 border-white ring-2 ring-green-500"
              title={`${user.first_name} ${user.last_name} - Active now`}
            />
          ))}
          {otherUsers.length > 3 && (
            <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs">
              +{otherUsers.length - 3}
            </div>
          )}
        </div>
        
        <span className="text-sm text-gray-600">
          {otherUsers.length === 1 
            ? `${otherUsers[0].first_name} is also viewing this ${pageContext}`
            : `${otherUsers.length} users are viewing this ${pageContext}`
          }
        </span>
      </div>
    </div>
  );
};
```

### Concurrent Access Notifications

**PresenceNotifications Component**:
```typescript
const PresenceNotifications: React.FC<{
  currentUsers: PresenceUser[];
  onUserJoin?: (user: PresenceUser) => void;
  onUserLeave?: (user: PresenceUser) => void;
}> = ({ currentUsers, onUserJoin, onUserLeave }) => {
  const [previousUsers, setPreviousUsers] = useState<PresenceUser[]>([]);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    const otherUsers = currentUsers.filter(u => u.id !== currentUser?.id);
    const prevOtherUsers = previousUsers.filter(u => u.id !== currentUser?.id);

    // Detect new users joining
    const newUsers = otherUsers.filter(user => 
      !prevOtherUsers.some(prev => prev.id === user.id)
    );

    // Detect users leaving
    const leftUsers = prevOtherUsers.filter(user =>
      !otherUsers.some(curr => curr.id === user.id)
    );

    // Show join notifications
    newUsers.forEach(user => {
      toast.info(
        `${user.first_name} ${user.last_name} joined this page`,
        {
          duration: 3000,
          icon: '👋'
        }
      );
      onUserJoin?.(user);
    });

    // Show leave notifications
    leftUsers.forEach(user => {
      toast.info(
        `${user.first_name} ${user.last_name} left this page`,
        {
          duration: 2000,
          icon: '👋'
        }
      );
      onUserLeave?.(user);
    });

    setPreviousUsers(currentUsers);
  }, [currentUsers, previousUsers, currentUser, onUserJoin, onUserLeave]);

  return null; // This component only manages notifications
};
```

## Concurrent Access Modal

### User Conflict Prevention

**ConcurrentUserModal Component**:
```typescript
const ConcurrentUserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  conflictingUsers: PresenceUser[];
  resourceType: string;
  resourceName: string;
  onProceedAnyway: () => void;
  onWaitForUsers: () => void;
}> = ({ 
  isOpen, 
  onClose, 
  conflictingUsers, 
  resourceType, 
  resourceName,
  onProceedAnyway,
  onWaitForUsers 
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span>Concurrent Access Detected</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            The following users are currently viewing or editing this {resourceType}:
          </p>
          
          <div className="space-y-2">
            {conflictingUsers.map(user => (
              <div key={user.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                <ProfileAvatar user={user} size="sm" />
                <div>
                  <p className="font-medium text-sm">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Last seen: {formatDistanceToNow(new Date(user.last_seen))} ago
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded p-3">
            <p className="text-sm text-amber-800">
              ⚠️ Making changes while others are editing may cause data conflicts. 
              Consider coordinating with your team before proceeding.
            </p>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={onWaitForUsers}
            className="w-full sm:w-auto"
          >
            Wait for Users
          </Button>
          <Button 
            variant="default"
            onClick={onProceedAnyway}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700"
          >
            Proceed Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

## Integration with Application Pages

### Page-Level Presence Implementation

**Client Details Page Integration**:
```typescript
const ClientDetails: React.FC = () => {
  const { clientId } = useParams();
  const { currentUsers } = usePresence(`client-${clientId}`);
  const [showConcurrentModal, setShowConcurrentModal] = useState(false);

  // Check for concurrent users before allowing edits
  const handleEdit = () => {
    const otherUsers = currentUsers.filter(u => u.id !== currentUser?.id);
    
    if (otherUsers.length > 0) {
      setShowConcurrentModal(true);
    } else {
      proceedWithEdit();
    }
  };

  return (
    <div className="client-details-page">
      {/* Presence indicator in header */}
      <div className="page-header">
        <h1>Client Details</h1>
        <PresenceIndicator 
          currentUsers={currentUsers}
          pageContext="client record"
        />
      </div>

      {/* Page content */}
      <div className="content">
        {/* Client details content */}
      </div>

      {/* Concurrent access modal */}
      <ConcurrentUserModal
        isOpen={showConcurrentModal}
        onClose={() => setShowConcurrentModal(false)}
        conflictingUsers={currentUsers.filter(u => u.id !== currentUser?.id)}
        resourceType="client record"
        resourceName={clientData?.name || 'Unknown'}
        onProceedAnyway={() => {
          setShowConcurrentModal(false);
          proceedWithEdit();
        }}
        onWaitForUsers={() => {
          setShowConcurrentModal(false);
          // Maybe refresh in 30 seconds
          setTimeout(() => handleEdit(), 30000);
        }}
      />

      {/* Presence notifications */}
      <PresenceNotifications
        currentUsers={currentUsers}
        onUserJoin={(user) => console.log(`${user.first_name} joined`)}
        onUserLeave={(user) => console.log(`${user.first_name} left`)}
      />
    </div>
  );
};
```

## Backend API Integration

### Presence Management Endpoints

**User Presence API Routes**:
```python
# app/api/routes/user_presence.py
from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from app.utils.security import get_current_user
from app.db.database import get_db

router = APIRouter()

@router.post("/user_page_presence")
async def update_user_presence(
    presence_data: dict,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Update user's presence on a specific page"""
    
    await db.execute("""
        INSERT INTO user_page_presence (user_id, page_identifier, last_seen)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, page_identifier)
        DO UPDATE SET last_seen = $3
    """, current_user["id"], presence_data["page_identifier"], datetime.utcnow())
    
    return {"status": "updated"}

@router.get("/user_page_presence/{page_identifier}")
async def get_page_presence(
    page_identifier: str,
    db = Depends(get_db)
):
    """Get all users currently present on a page"""
    
    # Consider users active if last seen within 2 minutes
    cutoff_time = datetime.utcnow() - timedelta(minutes=2)
    
    users = await db.fetch("""
        SELECT p.id, p.first_name, p.last_name, p.email, upp.last_seen
        FROM user_page_presence upp
        JOIN profiles p ON p.id = upp.user_id
        WHERE upp.page_identifier = $1 
          AND upp.last_seen > $2
        ORDER BY upp.last_seen DESC
    """, page_identifier, cutoff_time)
    
    return [dict(user) for user in users]

@router.delete("/user_page_presence")
async def clear_user_presence(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Clear all presence records for current user (on logout)"""
    
    await db.execute(
        "DELETE FROM user_page_presence WHERE user_id = $1",
        current_user["id"]
    )
    
    return {"status": "cleared"}
```

### Presence Cleanup and Maintenance

**Automated Presence Cleanup**:
```python
# Background task to clean up stale presence records
import asyncio
from datetime import datetime, timedelta

async def cleanup_stale_presence():
    """Remove presence records older than 5 minutes"""
    while True:
        try:
            cutoff_time = datetime.utcnow() - timedelta(minutes=5)
            
            result = await db.execute(
                "DELETE FROM user_page_presence WHERE last_seen < $1",
                cutoff_time
            )
            
            if result:
                logger.info(f"Cleaned up {result} stale presence records")
                
        except Exception as e:
            logger.error(f"Error cleaning up presence records: {e}")
        
        # Run every 2 minutes
        await asyncio.sleep(120)

# Start cleanup task with application
asyncio.create_task(cleanup_stale_presence())
```

## Performance Considerations

### Optimization Strategies

**Database Performance**:
- Indexed queries for fast presence lookups
- Automatic cleanup of stale records
- Composite index on (user_id, page_identifier) for unique constraints

**Frontend Performance**:
- 30-second polling intervals to balance real-time updates with server load
- Debounced presence updates to avoid excessive API calls
- Memoized components to prevent unnecessary re-renders

**Scalability Features**:
- Page-specific presence tracking (not global)
- User filtering to show only relevant concurrent users
- Configurable polling intervals based on page importance

This concurrent features system enhances team collaboration while maintaining system performance and providing intuitive user experience for multi-user wealth management operations.