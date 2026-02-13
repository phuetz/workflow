/**
 * Collaboration Service Tests
 * Tests for real-time collaboration, presence, and conflict resolution
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { CollaborationChange, ChangeType } from '../types/collaboration';

// Mock WebSocket server before importing CollaborationService
const mockWsServer = {
  on: vi.fn(),
  broadcast: vi.fn(),
  sendToClient: vi.fn(),
  handleJoinRoom: vi.fn()
};

vi.mock('../backend/websocket/WebSocketServer', () => ({
  getWebSocketServer: () => mockWsServer
}));

// Import after mocks are set up
const { CollaborationService } = await import('../backend/services/CollaborationService');

describe('CollaborationService', () => {
  let service: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockWsServer.on.mockClear();
    mockWsServer.broadcast.mockClear();
    mockWsServer.sendToClient.mockClear();
    mockWsServer.handleJoinRoom.mockClear();

    service = new CollaborationService();
  });

  afterEach(() => {
    if (service) {
      service.shutdown();
    }
  });

  describe('Session Management', () => {
    it('should create a collaboration session', async () => {
      const workflowId = 'workflow-1';
      const userId = 'user-1';

      const session = await service.createSession(workflowId, userId);

      expect(session).toBeDefined();
      expect(session.workflowId).toBe(workflowId);
      expect(session.isActive).toBe(true);
      expect(session.participants).toEqual([]);
    });

    it('should join a session', async () => {
      const workflowId = 'workflow-1';
      const userId = 'user-1';
      const userName = 'Test User';

      const session = await service.createSession(workflowId, userId);
      await service.joinSession(session.id, userId, userName, 'editor');

      expect(session.participants).toHaveLength(1);
      expect(session.participants[0].userId).toBe(userId);
      expect(session.participants[0].userName).toBe(userName);
      expect(session.participants[0].status).toBe('online');
    });

    it('should leave a session', async () => {
      const workflowId = 'workflow-1';
      const userId = 'user-1';
      const userName = 'Test User';

      const session = await service.createSession(workflowId, userId);
      await service.joinSession(session.id, userId, userName, 'editor');
      await service.leaveSession(session.id, userId);

      const participant = session.participants.find(p => p.userId === userId);
      expect(participant?.status).toBe('offline');
    });

    it('should return same session for same workflow', async () => {
      const workflowId = 'workflow-1';
      const userId1 = 'user-1';
      const userId2 = 'user-2';

      const session1 = await service.createSession(workflowId, userId1);
      const session2 = await service.createSession(workflowId, userId2);

      expect(session1.id).toBe(session2.id);
    });
  });

  describe('Presence Tracking', () => {
    it('should update user presence', async () => {
      const workflowId = 'workflow-1';
      const userId = 'user-1';
      const userName = 'Test User';

      const session = await service.createSession(workflowId, userId);
      await service.joinSession(session.id, userId, userName, 'editor');

      await service.updatePresence(workflowId, userId, {
        cursor: { x: 100, y: 200 },
        selection: ['node-1']
      });

      const presence = await service.getPresence(workflowId);
      expect(presence).toHaveLength(1);
      expect(presence[0].userId).toBe(userId);
      expect(presence[0].cursor).toEqual({ x: 100, y: 200 });
      expect(presence[0].selection).toEqual(['node-1']);
    });

    it('should broadcast presence updates to other users', async () => {
      const workflowId = 'workflow-1';
      const userId = 'user-1';

      const session = await service.createSession(workflowId, userId);
      await service.joinSession(session.id, userId, 'User 1', 'editor');

      await service.updatePresence(workflowId, userId, {
        cursor: { x: 100, y: 200 }
      });

      expect(mockWsServer.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'collaboration:presence-update',
          data: expect.objectContaining({
            userId,
            presence: expect.objectContaining({
              cursor: { x: 100, y: 200 }
            })
          })
        }),
        expect.objectContaining({
          room: `workflow:${workflowId}`,
          exclude: [userId]
        })
      );
    });

    it('should remove inactive presence', async () => {
      const workflowId = 'workflow-1';
      const userId = 'user-1';

      const session = await service.createSession(workflowId, userId);
      await service.joinSession(session.id, userId, 'User 1', 'editor');

      // Manually trigger cleanup (normally done by interval)
      await service.leaveSession(session.id, userId);

      const presence = await service.getPresence(workflowId);
      expect(presence).toHaveLength(0);
    });
  });

  describe('Node Locking', () => {
    it('should acquire lock on node', async () => {
      const nodeId = 'node-1';
      const userId = 'user-1';
      const userName = 'Test User';

      const locked = await service.acquireNodeLock(nodeId, userId, userName);

      expect(locked).toBe(true);
      expect(service.isNodeLocked(nodeId)).toBe(false); // Not locked for the same user
      expect(service.isNodeLocked(nodeId, 'user-2')).toBe(true); // Locked for other users
    });

    it('should prevent multiple users from locking same node', async () => {
      const nodeId = 'node-1';
      const user1 = 'user-1';
      const user2 = 'user-2';

      const locked1 = await service.acquireNodeLock(nodeId, user1, 'User 1');
      const locked2 = await service.acquireNodeLock(nodeId, user2, 'User 2');

      expect(locked1).toBe(true);
      expect(locked2).toBe(false);
    });

    it('should release lock', async () => {
      const nodeId = 'node-1';
      const userId = 'user-1';

      await service.acquireNodeLock(nodeId, userId, 'User 1');
      await service.releaseNodeLock(nodeId, userId);

      expect(service.isNodeLocked(nodeId)).toBe(false);
    });

    it('should get lock information', async () => {
      const nodeId = 'node-1';
      const userId = 'user-1';
      const userName = 'Test User';

      await service.acquireNodeLock(nodeId, userId, userName);

      const lock = service.getNodeLock(nodeId);

      expect(lock).toBeDefined();
      expect(lock?.userId).toBe(userId);
      expect(lock?.userName).toBe(userName);
    });

    it('should throw error when trying to edit locked node', async () => {
      const workflowId = 'workflow-1';
      const nodeId = 'node-1';
      const user1 = 'user-1';
      const user2 = 'user-2';

      const session = await service.createSession(workflowId, user1);
      await service.joinSession(session.id, user1, 'User 1', 'editor');
      await service.acquireNodeLock(nodeId, user1, 'User 1');

      const change: Omit<CollaborationChange, 'id' | 'timestamp' | 'applied'> = {
        sessionId: session.id,
        userId: user2,
        userName: 'User 2',
        type: 'node_updated',
        description: 'Update node',
        data: {
          nodeId,
          property: 'name',
          newValue: 'New Name'
        }
      };

      await expect(service.applyChange(workflowId, user2, change)).rejects.toThrow('Node is locked');
    });
  });

  describe('Operational Transformation', () => {
    it('should apply change without conflicts', async () => {
      const workflowId = 'workflow-1';
      const userId = 'user-1';

      const session = await service.createSession(workflowId, userId);
      await service.joinSession(session.id, userId, 'User 1', 'editor');

      const change: Omit<CollaborationChange, 'id' | 'timestamp' | 'applied'> = {
        sessionId: session.id,
        userId,
        userName: 'User 1',
        type: 'node_added',
        description: 'Add new node',
        data: {
          nodeId: 'node-1'
        }
      };

      const result = await service.applyChange(workflowId, userId, change);

      expect(result).toBeDefined();
      expect(result.applied).toBe(true);
      expect(session.changes).toContain(result);
    });

    it('should broadcast changes to other users', async () => {
      const workflowId = 'workflow-1';
      const userId = 'user-1';

      const session = await service.createSession(workflowId, userId);
      await service.joinSession(session.id, userId, 'User 1', 'editor');

      const change: Omit<CollaborationChange, 'id' | 'timestamp' | 'applied'> = {
        sessionId: session.id,
        userId,
        userName: 'User 1',
        type: 'node_added',
        description: 'Add new node',
        data: { nodeId: 'node-1' }
      };

      await service.applyChange(workflowId, userId, change);

      expect(mockWsServer.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'collaboration:change'
        }),
        expect.objectContaining({
          room: `workflow:${workflowId}`,
          exclude: [userId]
        })
      );
    });

    it('should detect concurrent edit conflicts', async () => {
      const workflowId = 'workflow-1';
      const nodeId = 'node-1';

      const changes: CollaborationChange[] = [
        {
          id: 'change-1',
          sessionId: 'session-1',
          userId: 'user-1',
          userName: 'User 1',
          type: 'node_updated',
          timestamp: new Date(),
          description: 'Update property',
          data: { nodeId, property: 'name', newValue: 'Name 1' },
          applied: true
        },
        {
          id: 'change-2',
          sessionId: 'session-1',
          userId: 'user-2',
          userName: 'User 2',
          type: 'node_updated',
          timestamp: new Date(),
          description: 'Update property',
          data: { nodeId, property: 'name', newValue: 'Name 2' },
          applied: true
        }
      ];

      const conflicts = await service.detectConflicts(workflowId, changes);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('concurrent_edit');
      expect(conflicts[0].users).toHaveLength(2);
    });

    it('should handle different properties without conflict', async () => {
      const workflowId = 'workflow-1';
      const nodeId = 'node-1';

      const changes: CollaborationChange[] = [
        {
          id: 'change-1',
          sessionId: 'session-1',
          userId: 'user-1',
          userName: 'User 1',
          type: 'node_updated',
          timestamp: new Date(),
          description: 'Update name',
          data: { nodeId, property: 'name', newValue: 'New Name' },
          applied: true
        },
        {
          id: 'change-2',
          sessionId: 'session-1',
          userId: 'user-2',
          userName: 'User 2',
          type: 'node_updated',
          timestamp: new Date(),
          description: 'Update description',
          data: { nodeId, property: 'description', newValue: 'New Description' },
          applied: true
        }
      ];

      const conflicts = await service.detectConflicts(workflowId, changes);

      expect(conflicts).toHaveLength(0);
    });
  });

  describe('Comments', () => {
    it('should add a comment', async () => {
      const workflowId = 'workflow-1';

      const comment = await service.addComment(workflowId, {
        workflowId,
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'This is a test comment',
        mentions: [],
        isResolved: false
      });

      expect(comment).toBeDefined();
      expect(comment.id).toBeDefined();
      expect(comment.content).toBe('This is a test comment');
      expect(comment.createdAt).toBeInstanceOf(Date);
    });

    it('should get comments for workflow', async () => {
      const workflowId = 'workflow-1';

      await service.addComment(workflowId, {
        workflowId,
        authorId: 'user-1',
        authorName: 'User 1',
        content: 'Comment 1',
        mentions: [],
        isResolved: false
      });

      await service.addComment(workflowId, {
        workflowId,
        authorId: 'user-2',
        authorName: 'User 2',
        content: 'Comment 2',
        mentions: [],
        isResolved: false
      });

      const comments = await service.getComments(workflowId);

      expect(comments).toHaveLength(2);
    });

    it('should get comments for specific node', async () => {
      const workflowId = 'workflow-1';
      const nodeId = 'node-1';

      await service.addComment(workflowId, {
        workflowId,
        nodeId,
        authorId: 'user-1',
        authorName: 'User 1',
        content: 'Node comment',
        mentions: [],
        isResolved: false
      });

      await service.addComment(workflowId, {
        workflowId,
        authorId: 'user-1',
        authorName: 'User 1',
        content: 'Workflow comment',
        mentions: [],
        isResolved: false
      });

      const nodeComments = await service.getComments(workflowId, nodeId);

      expect(nodeComments).toHaveLength(1);
      expect(nodeComments[0].content).toBe('Node comment');
    });

    it('should resolve a comment', async () => {
      const workflowId = 'workflow-1';

      const comment = await service.addComment(workflowId, {
        workflowId,
        authorId: 'user-1',
        authorName: 'User 1',
        content: 'Test comment',
        mentions: [],
        isResolved: false
      });

      await service.resolveComment(comment.id, 'user-2', 'User 2');

      const comments = await service.getComments(workflowId);
      const resolvedComment = comments.find(c => c.id === comment.id);

      expect(resolvedComment?.isResolved).toBe(true);
      expect(resolvedComment?.resolvedBy).toBe('user-2');
    });

    it('should broadcast comment additions', async () => {
      const workflowId = 'workflow-1';

      await service.addComment(workflowId, {
        workflowId,
        authorId: 'user-1',
        authorName: 'User 1',
        content: 'Test comment',
        mentions: [],
        isResolved: false
      });

      expect(mockWsServer.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'collaboration:comment-added'
        }),
        expect.any(Object)
      );
    });

    it('should notify mentioned users', async () => {
      const workflowId = 'workflow-1';

      await service.addComment(workflowId, {
        workflowId,
        authorId: 'user-1',
        authorName: 'User 1',
        content: 'Hey @user2, check this out',
        mentions: ['user-2'],
        isResolved: false
      });

      expect(mockWsServer.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'collaboration:mention'
        }),
        expect.any(Object)
      );
    });
  });

  describe('Statistics', () => {
    it('should return service statistics', async () => {
      const workflowId1 = 'workflow-1';
      const workflowId2 = 'workflow-2';

      await service.createSession(workflowId1, 'user-1');
      await service.createSession(workflowId2, 'user-2');

      const session1 = await service.createSession(workflowId1, 'user-1');
      await service.joinSession(session1.id, 'user-1', 'User 1', 'editor');

      await service.addComment(workflowId1, {
        workflowId: workflowId1,
        authorId: 'user-1',
        authorName: 'User 1',
        content: 'Comment',
        mentions: [],
        isResolved: false
      });

      const stats = service.getStats();

      expect(stats.activeSessions).toBe(2);
      expect(stats.totalComments).toBe(1);
    });
  });

  describe('Permissions', () => {
    it('should grant correct permissions based on role', async () => {
      const workflowId = 'workflow-1';

      const sessionOwner = await service.createSession(workflowId, 'user-owner');
      await service.joinSession(sessionOwner.id, 'user-owner', 'Owner', 'owner');

      const sessionViewer = await service.createSession(workflowId, 'user-viewer');
      await service.joinSession(sessionViewer.id, 'user-viewer', 'Viewer', 'viewer');

      const owner = sessionOwner.participants.find(p => p.userId === 'user-owner');
      const viewer = sessionViewer.participants.find(p => p.userId === 'user-viewer');

      expect(owner?.permissions).toContain('write');
      expect(owner?.permissions).toContain('delete');
      expect(viewer?.permissions).toContain('read');
      expect(viewer?.permissions).not.toContain('write');
    });
  });
});
