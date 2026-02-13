/**
 * Collaboration Dashboard Component
 * Real-time collaboration, sharing, and team management interface
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Share2,
  MessageSquare,
  Eye,
  Edit3,
  UserPlus,
  Crown,
  Shield,
  Copy,
  ExternalLink,
  MoreVertical,
  Send,
  AtSign,
  Heart,
  ThumbsUp,
  Activity,
  BarChart3,
  RefreshCw,
  Globe,
  Lock,
  X
} from 'lucide-react';
import { collaborationService } from '../../services/CollaborationService';
import type {
  WorkflowCollaborator,
  CollaborationSession,
  WorkflowShare,
  WorkflowComment,
  CollaborationAnalytics,
  RealtimePresence,
  CollaborationRole,
  CollaborationPermission,
  SharePermission,
  ShareType
} from '../../types/collaboration';
import { logger } from '../../services/SimpleLogger';

interface CollaborationDashboardProps {
  workflowId: string;
  currentUserId: string;
  onClose?: () => void;
}

export const CollaborationDashboard: React.FC<CollaborationDashboardProps> = ({
  workflowId,
  currentUserId,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'collaborators' | 'shares' | 'comments' | 'analytics'>('collaborators');
  const [collaborators, setCollaborators] = useState<WorkflowCollaborator[]>([]);
  const [shares, setShares] = useState<WorkflowShare[]>([]);
  const [comments, setComments] = useState<WorkflowComment[]>([]);
  const [analytics, setAnalytics] = useState<CollaborationAnalytics | null>(null);
  const [presence, setPresence] = useState<RealtimePresence[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [showAddCollaborator, setShowAddCollaborator] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showCreateShare, setShowCreateShare] = useState(false);

  const loadCollaborationData = async () => {
    try {
      const [collaboratorsData, analyticsData] = await Promise.all([
        collaborationService.getCollaborators(workflowId),
        collaborationService.getCollaborationAnalytics(workflowId, {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          end: new Date()
        })
      ]);

      setCollaborators(collaboratorsData);
      setAnalytics(analyticsData);

      // Load comments and shares (mock data for now)
      const commentsData: WorkflowComment[] = [];
      setComments(commentsData);

    } catch (error) {
      logger.error('Failed to load collaboration data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollaborationData();
    // Mock session initialization
    setSession({
      id: 'session-1',
      workflowId,
      participants: [],
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      changes: []
    });
  }, [workflowId]);

  const initializeSession = useCallback(async () => {
    try {
      let activeSession = await collaborationService.getActiveSession(workflowId);
      
      if (!activeSession) {
        activeSession = await collaborationService.createSession(workflowId);
      }
      
      await collaborationService.joinSession(activeSession.id, currentUserId);
      setSession(activeSession);

      // Subscribe to presence updates
      await collaborationService.subscribeToPresence(activeSession.id, (presenceData) => {
        setPresence(presenceData);
      });

    } catch (error) {
      logger.error('Failed to initialize collaboration session:', error);
    }
  }, [workflowId, currentUserId]);

  useEffect(() => {
    loadCollaborationData();
    initializeSession();
  }, [loadCollaborationData, initializeSession]);

  const handleAddCollaborator = async (email: string, role: CollaborationRole) => {
    try {
      const newCollaborator = await collaborationService.addCollaborator(workflowId, {
        userId: `user-${Date.now()}`,
        userName: email.split('@')[0],
        userEmail: email,
        role,
        permissions: getRolePermissions(role),
        status: 'offline',
        lastSeen: new Date(),
        invitedBy: currentUserId,
        invitedAt: new Date()
      });
      
      setCollaborators(prev => [...prev, newCollaborator]);
      setShowAddCollaborator(false);
    } catch (error) {
      logger.error('Failed to add collaborator:', error);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const createShare = async (shareType: ShareType, permissions: SharePermission[]) => {
    try {
      const shareData: Omit<WorkflowShare, 'id' | 'accessCount'> = {
        workflowId,
        shareType,
        sharedBy: currentUserId,
        sharedAt: new Date(),
        permissions,
        metadata: {
          title: `Shared Workflow - ${new Date().toLocaleDateString()}`
        }
      };
      const newShare = await collaborationService.createShare(workflowId, shareData);

      setShares(prev => [...prev, newShare]);
      setShowCreateShare(false);
    } catch (error) {
      logger.error('Failed to create share:', error);
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    try {
      const comment = await collaborationService.addComment({
        workflowId,
        authorId: currentUserId,
        authorName: 'Current User',
        content: newComment,
        mentions: [],
        isResolved: false,
        replies: [],
        reactions: []
      });
      
      setComments(prev => [comment, ...prev]);
      setNewComment('');
    } catch (error) {
      logger.error('Failed to add comment:', error);
    }
  };

  const getRolePermissions = (role: string): CollaborationPermission[] => {
    switch (role) {
      case 'owner': return ['read', 'write', 'execute', 'share', 'manage_users', 'delete'];
      case 'admin': return ['read', 'write', 'execute', 'share', 'manage_users'];
      case 'editor': return ['read', 'write', 'execute'];
      case 'viewer': return ['read'];
      case 'commenter': return ['read'];
      default: return ['read'];
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return Crown;
      case 'admin': return Shield;
      case 'editor': return Edit3;
      case 'viewer': return Eye;
      case 'commenter': return MessageSquare;
      default: return Users;
    }
  };

  const getPresenceIndicatorClass = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const renderCollaborators = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Team Collaborators</h3>
          <p className="text-sm text-gray-600">{collaborators.length} members</p>
        </div>
        <button
          onClick={() => setShowAddCollaborator(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Member
        </button>
      </div>

      {/* Online Presence */}
      {presence.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">Currently Online</h4>
          <div className="flex items-center space-x-3">
            {presence.map((p) => (
              <div key={p.userId} className="flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-sm font-medium text-green-700">
                    {p.userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-green-700">{p.userName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collaborators List */}
      <div className="space-y-3">
        {collaborators.map((collaborator) => {
          const RoleIcon = getRoleIcon(collaborator.role);

          return (
            <div key={collaborator.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <div className="relative">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    {collaborator.avatar ? (
                      <img src={collaborator.avatar} alt={collaborator.userName} className="w-10 h-10 rounded-full" />
                    ) : (
                      <span className="text-sm font-medium text-gray-700">
                        {collaborator.userName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(collaborator.status)}`}></div>
                </div>

                <div className="ml-3">
                  <div className="flex items-center">
                    <p className="font-medium text-gray-900">{collaborator.userName}</p>
                    <RoleIcon className="w-4 h-4 ml-2 text-gray-500" />
                  </div>
                  <p className="text-sm text-gray-600">{collaborator.userEmail}</p>
                  <p className="text-xs text-gray-500">
                    Last seen: {collaborator.lastSeen.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                  collaborator.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                  collaborator.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                  collaborator.role === 'editor' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {collaborator.role}
                </span>
                
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Collaborator Modal */}
      {showAddCollaborator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Collaborator</h3>
              <button
                onClick={() => setShowAddCollaborator(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const email = formData.get('email') as string;
              const role = formData.get('role') as CollaborationRole;
              handleAddCollaborator(email, role);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="colleague@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    name="role"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="commenter">Commenter</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddCollaborator(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderShares = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Shared Links</h3>
          <p className="text-sm text-gray-600">Manage public and private sharing</p>
        </div>
        <button
          onClick={() => setShowCreateShare(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Create Share
        </button>
      </div>

      {shares.length === 0 ? (
        <div className="text-center py-12">
          <Share2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No shares created yet</p>
          <p className="text-sm text-gray-500">Create a share link to collaborate with others</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shares.map((share) => (
            <div key={share.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  {share.shareType === 'public' ? (
                    <Globe className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Lock className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{share.metadata.title}</p>
                  <p className="text-sm text-gray-600 capitalize">{share.shareType} access</p>
                  <p className="text-xs text-gray-500">
                    Created {share.sharedAt.toLocaleDateString()} • {share.accessCount} views
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <Copy className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderComments = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Comments & Discussions</h3>
        <p className="text-sm text-gray-600">{comments.length} comments</p>
      </div>

      {/* Add Comment */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-blue-700">U</span>
          </div>
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <AtSign className="w-4 h-4" />
                <span>Mention users with @</span>
              </div>
              <button
                onClick={addComment}
                disabled={!newComment.trim()}
                className="flex items-center px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
              >
                <Send className="w-4 h-4 mr-1" />
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {comment.authorName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-900">{comment.authorName}</span>
                    <span className="text-sm text-gray-500">
                      {comment.createdAt.toLocaleString()}
                    </span>
                    {comment.isResolved && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                        Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700">{comment.content}</p>
                  
                  {/* Reactions */}
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <button className="flex items-center hover:text-blue-600">
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      {comment.reactions.find(r => r.emoji === '👍')?.count || 0}
                    </button>
                    <button className="flex items-center hover:text-red-600">
                      <Heart className="w-4 h-4 mr-1" />
                      {comment.reactions.find(r => r.emoji === '❤️')?.count || 0}
                    </button>
                    <button className="hover:text-blue-600">Reply</button>
                    {!comment.isResolved && (
                      <button className="hover:text-green-600">Resolve</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAnalytics = () => {
    if (!analytics) return null;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold">Collaboration Analytics</h3>
          <p className="text-sm text-gray-600">Last 30 days overview</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-blue-600">Active Collaborators</p>
                <p className="text-2xl font-bold text-blue-900">{analytics.metrics.activeCollaborators}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-green-600">Total Changes</p>
                <p className="text-2xl font-bold text-green-900">{analytics.metrics.totalChanges}</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center">
              <MessageSquare className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm text-purple-600">Comments</p>
                <p className="text-2xl font-bold text-purple-900">{analytics.metrics.commentsCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Collaborator Activity */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold mb-4">Collaborator Activity</h4>
          <div className="space-y-3">
            {analytics.collaboratorActivity.map((activity) => (
              <div key={activity.userId} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-medium text-gray-700">
                      {activity.userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{activity.userName}</p>
                    <p className="text-sm text-gray-600">
                      {activity.changesCount} changes • {activity.commentsCount} comments
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{activity.activeDays} days</p>
                  <p className="text-xs text-gray-500">active</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-600">Loading collaboration data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Users className="w-6 h-6 text-gray-700 mr-3" />
            <div>
              <h2 className="text-lg font-semibold">Collaboration</h2>
              <p className="text-sm text-gray-600">
                Manage team access, sharing, and discussions
              </p>
            </div>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 p-2"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex space-x-8">
          {[
            { id: 'collaborators' as const, label: 'Team', icon: Users, count: collaborators.length },
            { id: 'shares' as const, label: 'Shares', icon: Share2, count: shares.length },
            { id: 'comments' as const, label: 'Comments', icon: MessageSquare, count: comments.length },
            { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'collaborators' && renderCollaborators()}
        {activeTab === 'shares' && renderShares()}
        {activeTab === 'comments' && renderComments()}
        {activeTab === 'analytics' && renderAnalytics()}
      </div>
    </div>
  );
}