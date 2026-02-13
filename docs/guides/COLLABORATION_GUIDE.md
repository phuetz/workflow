# Real-Time Collaboration System - Complete Guide

## Overview

This comprehensive real-time collaboration system enables multiple users to simultaneously edit workflows with conflict-free synchronization, similar to Google Docs or Figma.

## Features

### 1. Real-Time Presence & Cursors
- Live cursor tracking for all users
- User avatars and status indicators
- Viewport and selection awareness
- Automatic cleanup of inactive users

### 2. Collaborative Editing
- Operational Transformation (OT) for conflict resolution
- Node-level locking mechanism
- Optimistic updates with server validation
- Version vectors for causality tracking
- Delta synchronization for bandwidth optimization

### 3. Communication
- Thread-based comment system
- @mentions with notifications
- Emoji reactions
- Comment resolution tracking
- Attachment support (planned)

### 4. Access Control
- Role-based permissions (owner, admin, editor, viewer, commenter)
- Granular permission system
- Team management
- Workflow sharing with expiration

### 5. Activity Tracking
- Real-time activity feed
- Change history
- Conflict detection and resolution
- Audit trail

## Architecture

```
┌─────────────────┐
│  React Client   │
│   Components    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  React Hooks    │
│ useCollaboration│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  WebSocket      │
│  Connection     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend API    │
│ WebSocketServer │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Collaboration   │
│    Service      │
└─────────────────┘
```

## Quick Start

### Basic Usage

```tsx
import { CollaborativeWorkflowEditor } from './components/collaboration/CollaborativeWorkflowEditor';

function MyWorkflow() {
  return (
    <CollaborativeWorkflowEditor
      workflowId="workflow-123"
      userId="user-456"
      userName="John Doe"
      userEmail="john@example.com"
    >
      <YourWorkflowEditor />
    </CollaborativeWorkflowEditor>
  );
}
```

### Using the Hook Directly

```tsx
import { useCollaboration } from './hooks/useCollaboration';

function MyComponent() {
  const {
    isConnected,
    presence,
    updatePresence,
    applyChange,
    acquireLock,
    releaseLock,
    comments,
    addComment
  } = useCollaboration({
    workflowId: 'workflow-123',
    userId: 'user-456',
    userName: 'John Doe',
    userEmail: 'john@example.com'
  });

  // Use the collaboration features
}
```

## Core Concepts

### 1. Sessions

A collaboration session represents an active editing session for a workflow.

```typescript
interface CollaborationSession {
  id: string;
  workflowId: string;
  participants: WorkflowCollaborator[];
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
  changes: CollaborationChange[];
}
```

**Creating a session:**
```typescript
const session = await collaborationService.createSession(workflowId, userId);
```

**Joining a session:**
```typescript
await collaborationService.joinSession(sessionId, userId, userName, 'editor');
```

### 2. Presence Tracking

Presence shows who's currently viewing or editing the workflow.

```typescript
interface RealtimePresence {
  userId: string;
  userName: string;
  avatar?: string;
  cursor?: { x: number; y: number };
  selection?: string[];
  viewport?: { x: number; y: number; zoom: number };
  isActive: boolean;
  lastActivity: Date;
}
```

**Updating presence:**
```typescript
await updatePresence({
  cursor: { x: 100, y: 200 },
  selection: ['node-1', 'node-2'],
  viewport: { x: 0, y: 0, zoom: 1 }
});
```

### 3. Node Locking

Prevents concurrent edits to the same node.

**Acquiring a lock:**
```typescript
const locked = await acquireLock('node-123');
if (locked) {
  // Edit the node
  // ...
  await releaseLock('node-123');
} else {
  // Node is locked by another user
  const lock = getNodeLock('node-123');
  console.log(`Locked by ${lock.userName}`);
}
```

**Lock timeout:** Locks automatically expire after 30 seconds of inactivity.

### 4. Operational Transformation

Ensures conflict-free merging of concurrent changes.

```typescript
// User 1 changes node name
await applyChange({
  type: 'node_updated',
  description: 'Update node name',
  data: {
    nodeId: 'node-1',
    property: 'name',
    newValue: 'New Name 1'
  }
});

// User 2 changes node description (different property)
// Both changes will be applied without conflict
```

**Conflict scenarios handled:**
- Concurrent edits to different properties ✓
- Concurrent edits to same property (last-write-wins)
- Move conflicts (both moves applied)
- Delete/reference conflicts (delete wins)

### 5. Comments

Thread-based commenting with mentions and reactions.

**Adding a comment:**
```typescript
await addComment({
  workflowId: 'workflow-123',
  nodeId: 'node-1', // Optional, for node-specific comments
  authorId: userId,
  authorName: userName,
  content: 'This needs review @alice',
  mentions: ['alice'],
  isResolved: false
});
```

**Resolving a comment:**
```typescript
await resolveComment(commentId);
```

## Components

### CollaborativeCursors

Displays real-time cursor positions from all active users.

```tsx
import { CollaborativeCursors } from './components/collaboration/CollaborativeCursors';

<CollaborativeCursors
  cursors={cursorsMap}
  showLabels={true}
  fadeTimeout={5000}
/>
```

**Props:**
- `cursors`: Map of cursor positions by user ID
- `showLabels`: Show username labels
- `fadeTimeout`: Time before cursor fades (ms)

### PresenceAvatars

Shows avatars of all active users.

```tsx
import { PresenceAvatars } from './components/collaboration/PresenceAvatars';

<PresenceAvatars
  presence={presenceArray}
  maxVisible={5}
  size="md"
  showTooltip={true}
/>
```

**Props:**
- `presence`: Array of RealtimePresence objects
- `maxVisible`: Maximum avatars to show
- `size`: 'sm' | 'md' | 'lg'
- `showTooltip`: Show username on hover

### CommentThread

Full-featured comment system with threading and mentions.

```tsx
import { CommentThread } from './components/collaboration/CommentThread';

<CommentThread
  comments={commentsArray}
  workflowId="workflow-123"
  currentUserId={userId}
  currentUserName={userName}
  onAddComment={handleAddComment}
  onResolveComment={handleResolveComment}
  onReplyComment={handleReplyComment}
  onReaction={handleReaction}
/>
```

**Features:**
- Thread-based replies
- @mentions with autocomplete
- Emoji reactions
- Comment resolution
- Cmd+Enter to submit

### NodeLockIndicator

Visual indicator when a node is locked.

```tsx
import { NodeLockIndicator } from './components/collaboration/NodeLockIndicator';

<NodeLockIndicator
  locked={isLocked}
  lockedBy={{ userId: 'user-1', userName: 'Alice' }}
  position="top-right"
  size="md"
/>
```

### ActivityFeed

Real-time feed of all collaboration activity.

```tsx
import { ActivityFeed } from './components/collaboration/ActivityFeed';

<ActivityFeed
  changes={changesArray}
  maxItems={50}
  showTimestamps={true}
/>
```

**Features:**
- Filterable by change type
- Real-time updates
- Grouping by user (optional)
- Conflict indicators

### CollaborationToolbar

All-in-one toolbar with presence, activity, and comments.

```tsx
import { CollaborationToolbar } from './components/collaboration/CollaborationToolbar';

<CollaborationToolbar
  workflowId="workflow-123"
  presence={presenceArray}
  changes={changesArray}
  comments={commentsArray}
  currentUserId={userId}
  currentUserName={userName}
  isConnected={isConnected}
  onAddComment={handleAddComment}
  onResolveComment={handleResolveComment}
  onReplyComment={handleReplyComment}
  onReaction={handleReaction}
/>
```

## Backend Setup

### 1. Initialize Services

```typescript
import { initializeWebSocketServer } from './backend/websocket/WebSocketServer';
import { initializeCollaborationService } from './backend/services/CollaborationService';
import { createServer } from 'http';

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server
const wsServer = initializeWebSocketServer({
  server,
  path: '/ws',
  authentication: async (token) => {
    // Validate token and return user info
    return { userId: 'user-123' };
  }
});

// Initialize collaboration service
const collaborationService = initializeCollaborationService();

// Start server
server.listen(3001, () => {
  console.log('Server running on port 3001');
});
```

### 2. Authentication

The WebSocket server supports token-based authentication:

```typescript
const wsConfig = {
  authentication: async (token: string) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return { userId: decoded.userId };
    } catch {
      return null;
    }
  }
};
```

### 3. Rate Limiting

Built-in rate limiting prevents abuse:

```typescript
const wsConfig = {
  rateLimiting: {
    enabled: true,
    maxRequests: 100,
    windowMs: 60000 // 1 minute
  }
};
```

## Performance Optimization

### Client-Side

1. **Cursor Throttling**: Mouse movements are throttled to 50ms
2. **Presence Debouncing**: Presence updates are debounced to 100ms
3. **Virtual Rendering**: Only render visible cursors
4. **Message Batching**: Batch multiple changes before sending

### Server-Side

1. **Delta Sync**: Only send changes, not full state
2. **Room-Based Broadcasting**: Only send to relevant users
3. **Compression**: WebSocket compression enabled by default
4. **Efficient Data Structures**: Maps for O(1) lookups

### Bandwidth Usage

Typical bandwidth for 10 active users:
- Cursor updates: ~5 KB/s per user
- Presence updates: ~2 KB/s per user
- Changes: Variable, ~10 KB per change

**Optimizations:**
- Throttle cursor updates to 20 FPS (50ms)
- Only send cursor deltas
- Compress messages with permessage-deflate

## Security Considerations

### 1. Authentication

Always authenticate WebSocket connections:

```typescript
// Client
const ws = new WebSocket(url);
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    data: { token: authToken }
  }));
};
```

### 2. Authorization

Check permissions before applying changes:

```typescript
const canEdit = hasPermission(userId, workflowId, 'write');
if (!canEdit) {
  throw new Error('Unauthorized');
}
```

### 3. Input Validation

Validate all user input:

```typescript
const change = sanitizeChange(rawChange);
if (!validateChange(change)) {
  throw new Error('Invalid change');
}
```

### 4. Rate Limiting

Prevent spam and DoS:

```typescript
if (!rateLimiter.isAllowed(userId)) {
  throw new Error('Rate limit exceeded');
}
```

## Testing

### Unit Tests

```bash
npm run test -- collaboration.test.ts
```

### Integration Tests

```bash
npm run test:integration -- collaboration.integration.test.ts
```

### Load Testing

Test with 50+ concurrent users:

```bash
npm run test:load -- collaboration.load.test.ts
```

## Troubleshooting

### Connection Issues

**Problem:** WebSocket connection fails
**Solution:**
- Check CORS settings
- Verify WebSocket URL
- Check firewall rules

### Sync Issues

**Problem:** Changes not syncing
**Solution:**
- Check network latency
- Verify authentication
- Check rate limits

### Lock Issues

**Problem:** Locks not releasing
**Solution:**
- Locks auto-expire after 30s
- Check for JavaScript errors
- Verify lock release calls

### Performance Issues

**Problem:** High latency or lag
**Solution:**
- Reduce cursor update frequency
- Enable message compression
- Check server resources
- Optimize change payloads

## Best Practices

### 1. Always Release Locks

```typescript
try {
  await acquireLock(nodeId);
  // Edit node
} finally {
  await releaseLock(nodeId);
}
```

### 2. Throttle High-Frequency Updates

```typescript
const throttledUpdate = throttle((data) => {
  updatePresence(data);
}, 100);
```

### 3. Handle Disconnections Gracefully

```typescript
useEffect(() => {
  if (!isConnected) {
    // Save local changes
    // Show offline indicator
    // Queue changes for later sync
  }
}, [isConnected]);
```

### 4. Provide User Feedback

```typescript
if (!canAcquireLock) {
  toast.error(`Node locked by ${lockedBy.userName}`);
}
```

### 5. Clean Up on Unmount

```typescript
useEffect(() => {
  return () => {
    leaveSession();
    releaseLock(nodeId);
  };
}, []);
```

## Advanced Topics

### Custom Conflict Resolution

Implement custom merge strategies:

```typescript
const customMerge = (change1, change2) => {
  // Your custom merge logic
  return mergedChange;
};
```

### Offline Support

Queue changes while offline:

```typescript
const offlineQueue = [];

if (!isConnected) {
  offlineQueue.push(change);
} else {
  await applyChange(change);
}
```

### History & Time Travel

Access change history:

```typescript
const history = session.changes;
const previousState = reconstructState(history, timestamp);
```

### Analytics

Track collaboration metrics:

```typescript
const analytics = {
  activeUsers: stats.activeUsers,
  totalChanges: stats.totalChanges,
  conflictsResolved: conflicts.length,
  averageLatency: connectionStats.latency
};
```

## API Reference

See inline TypeScript documentation for complete API reference:
- `/src/types/collaboration.ts` - Type definitions
- `/src/backend/services/CollaborationService.ts` - Backend service
- `/src/hooks/useCollaboration.ts` - React hook
- `/src/components/collaboration/` - UI components

## Support

For issues or questions:
1. Check this documentation
2. Review TypeScript types
3. Check test files for examples
4. File an issue on GitHub

## License

MIT License - See LICENSE file for details
