import React, { useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Users, MessageCircle, Share2, Eye, Edit3, Crown, Send, X } from 'lucide-react';

interface CollaborationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({ isOpen, onClose }) => {
  const { collaborators, comments, addComment, updateCollaborator } = useWorkflowStore();
  const [activeTab, setActiveTab] = useState<'users' | 'chat' | 'comments'>('users');
  const [newMessage, setNewMessage] = useState('');
  const [newComment, setNewComment] = useState('');

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // In a real app, this would send to all collaborators
      console.log('Sending message:', newMessage);
      setNewMessage('');
    }
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      addComment({
        id: Date.now().toString(),
        text: newComment,
        author: 'Current User',
        timestamp: new Date(),
        resolved: false,
        nodeId: undefined // For general comments
      });
      setNewComment('');
    }
  };

  const handlePermissionChange = (userId: string, permission: 'view' | 'edit' | 'admin') => {
    updateCollaborator(userId, { permission });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-4 top-20 w-80 bg-white rounded-lg shadow-xl border z-50">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-800">Collaboration</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'users'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Users size={16} />
          Users ({collaborators.length})
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'chat'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <MessageCircle size={16} />
          Chat
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'comments'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Share2 size={16} />
          Comments ({comments.length})
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {activeTab === 'users' && (
          <div className="p-4 space-y-3">
            {collaborators.map((collaborator) => (
              <div key={collaborator.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-700">
                      {collaborator.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">{collaborator.name}</div>
                    <div className="text-xs text-gray-500">{collaborator.email}</div>
                  </div>
                  {collaborator.isOnline && (
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={collaborator.permission}
                    onChange={(e) => handlePermissionChange(collaborator.id, e.target.value as any)}
                    className="text-xs border rounded px-2 py-1"
                  >
                    <option value="view">View</option>
                    <option value="edit">Edit</option>
                    <option value="admin">Admin</option>
                  </select>
                  {collaborator.permission === 'admin' && <Crown size={14} className="text-yellow-500" />}
                  {collaborator.permission === 'edit' && <Edit3 size={14} className="text-blue-500" />}
                  {collaborator.permission === 'view' && <Eye size={14} className="text-gray-500" />}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="p-4">
            <div className="space-y-3 mb-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm font-medium text-gray-800">Alice Johnson</div>
                <div className="text-sm text-gray-600">Hey, I made some changes to the email workflow</div>
                <div className="text-xs text-gray-500 mt-1">2 minutes ago</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm font-medium text-blue-800">You</div>
                <div className="text-sm text-blue-600">Looks good! I'll review it now</div>
                <div className="text-xs text-blue-500 mt-1">1 minute ago</div>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="p-4">
            <div className="space-y-3 mb-4">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-800">{comment.author}</div>
                    <div className="text-xs text-gray-500">
                      {comment.timestamp.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">{comment.text}</div>
                  {comment.nodeId && (
                    <div className="text-xs text-blue-600 mt-1">On node: {comment.nodeId}</div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};