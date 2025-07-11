import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Users, MessageCircle, Eye, Edit, Share2 } from 'lucide-react';

interface CollaboratorCursor {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  lastSeen: string;
}

export default function CollaborationPanel() {
  const { darkMode, collaborators, currentUser } = useWorkflowStore();
  const [isOpen, setIsOpen] = useState(false);
  const [cursors, setCursors] = useState<CollaboratorCursor[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  // Simulation des curseurs collaboratifs
  useEffect(() => {
    const interval = setInterval(() => {
      setCursors(prev => prev.map(cursor => ({
        ...cursor,
        x: cursor.x + (Math.random() - 0.5) * 10,
        y: cursor.y + (Math.random() - 0.5) * 10,
        lastSeen: new Date().toISOString()
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const addComment = () => {
    if (newComment.trim()) {
      setComments(prev => [...prev, {
        id: Date.now().toString(),
        author: currentUser?.name || 'Current User',
        content: newComment,
        timestamp: new Date().toISOString(),
        resolved: false
      }]);
      setNewComment('');
    }
  };

  const toggleComment = (id: string) => {
    setComments(prev => prev.map(comment => 
      comment.id === id ? { ...comment, resolved: !comment.resolved } : comment
    ));
  };

  return (
    <>
      {/* Collaboration Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-20 right-4 z-40 p-3 rounded-full ${
          darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
        } shadow-lg border transition-colors`}
      >
        <Users size={20} />
        {collaborators.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {collaborators.length}
          </span>
        )}
      </button>

      {/* Collaboration Panel */}
      {isOpen && (
        <div className={`fixed top-20 right-16 z-30 w-80 max-h-96 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border rounded-lg shadow-xl overflow-hidden`}>
          {/* Header */}
          <div className={`p-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} border-b`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Collaboration</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
            {/* Active Collaborators */}
            <div>
              <h4 className="font-medium text-sm mb-2">Active Users</h4>
              <div className="space-y-2">
                {collaborators.map((collaborator, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: collaborator.color || '#3b82f6' }}
                    ></div>
                    <span className="text-sm">{collaborator.name}</span>
                    <div className="flex items-center space-x-1 ml-auto">
                      {collaborator.permissions?.includes('edit') ? (
                        <Edit size={12} className="text-green-500" />
                      ) : (
                        <Eye size={12} className="text-gray-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Share Settings */}
            <div>
              <h4 className="font-medium text-sm mb-2">Share</h4>
              <button className="w-full bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 flex items-center justify-center space-x-2">
                <Share2 size={14} />
                <span>Share Workflow</span>
              </button>
            </div>

            {/* Comments */}
            <div>
              <h4 className="font-medium text-sm mb-2">Comments</h4>
              <div className="space-y-2 mb-3">
                {comments.map((comment) => (
                  <div 
                    key={comment.id} 
                    className={`p-2 rounded text-sm ${
                      comment.resolved ? 'bg-green-50 opacity-60' : darkMode ? 'bg-gray-700' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-xs">{comment.author}</span>
                      <button
                        onClick={() => toggleComment(comment.id)}
                        className={`text-xs ${comment.resolved ? 'text-green-600' : 'text-gray-500'}`}
                      >
                        {comment.resolved ? '✓' : '○'}
                      </button>
                    </div>
                    <p className="text-xs">{comment.content}</p>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(comment.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className={`flex-1 px-2 py-1 text-sm rounded border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600' 
                      : 'bg-white border-gray-300'
                  }`}
                  onKeyPress={(e) => e.key === 'Enter' && addComment()}
                />
                <button
                  onClick={addComment}
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                >
                  <MessageCircle size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collaborative Cursors */}
      {cursors.map((cursor) => (
        <div
          key={cursor.id}
          className="fixed z-50 pointer-events-none"
          style={{ 
            left: cursor.x, 
            top: cursor.y,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div 
            className="w-4 h-4 rounded-full border-2 border-white"
            style={{ backgroundColor: cursor.color }}
          ></div>
          <div 
            className="text-xs font-medium px-2 py-1 rounded mt-1 text-white"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.name}
          </div>
        </div>
      ))}
    </>
  );
}