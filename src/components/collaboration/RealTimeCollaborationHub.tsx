import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  MessageSquare, 
  Video, 
  Monitor,
  MousePointer,
  Eye,
  Edit,
  Bell,
  Settings,
  Crown,
  Shield,
  Clock,
  Activity
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

interface CollaboratorCursor {
  id: string;
  userId: string;
  username: string;
  color: string;
  position: { x: number; y: number };
  lastSeen: Date;
  isActive: boolean;
}

interface CollaboratorUser {
  id: string;
  username: string;
  avatar: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'online' | 'away' | 'offline';
  lastActivity: Date;
  permissions: string[];
  cursor?: CollaboratorCursor;
  currentNode?: string;
}

interface CollaborationActivity {
  id: string;
  userId: string;
  username: string;
  action: string;
  nodeId?: string;
  timestamp: Date;
  details: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'system' | 'node-reference';
  nodeId?: string;
}

const SAMPLE_USERS: CollaboratorUser[] = [
  {
    id: '1',
    username: 'Alice Martin',
    avatar: '👩‍💻',
    role: 'owner',
    status: 'online',
    lastActivity: new Date(),
    permissions: ['edit', 'delete', 'share', 'execute'],
    currentNode: 'node-1'
  },
  {
    id: '2',
    username: 'Bob Dupont',
    avatar: '👨‍💼',
    role: 'editor',
    status: 'online',
    lastActivity: new Date(Date.now() - 120000),
    permissions: ['edit', 'execute'],
    currentNode: 'node-3'
  },
  {
    id: '3',
    username: 'Claire Petit',
    avatar: '👩‍🎨',
    role: 'viewer',
    status: 'away',
    lastActivity: new Date(Date.now() - 300000),
    permissions: ['view']
  }
];

const SAMPLE_ACTIVITIES: CollaborationActivity[] = [
  {
    id: '1',
    userId: '1',
    username: 'Alice Martin',
    action: 'edited',
    nodeId: 'node-1',
    timestamp: new Date(Date.now() - 60000),
    details: 'Modified HTTP Request configuration'
  },
  {
    id: '2',
    userId: '2',
    username: 'Bob Dupont',
    action: 'added',
    nodeId: 'node-3',
    timestamp: new Date(Date.now() - 180000),
    details: 'Added new Slack notification node'
  },
  {
    id: '3',
    userId: '1',
    username: 'Alice Martin',
    action: 'executed',
    timestamp: new Date(Date.now() - 300000),
    details: 'Executed workflow successfully'
  }
];

const SAMPLE_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    userId: '1',
    username: 'Alice Martin',
    message: 'J\'ai optimisé la configuration du nœud HTTP',
    timestamp: new Date(Date.now() - 300000),
    type: 'text'
  },
  {
    id: '2',
    userId: '2',
    username: 'Bob Dupont',
    message: 'Parfait ! Le délai de réponse est maintenant meilleur',
    timestamp: new Date(Date.now() - 240000),
    type: 'text'
  },
  {
    id: '3',
    userId: '1',
    username: 'Alice Martin',
    message: 'Regardez ce nœud',
    timestamp: new Date(Date.now() - 180000),
    type: 'node-reference',
    nodeId: 'node-1'
  }
];

type UserRole = 'owner' | 'editor' | 'viewer';

export default function RealTimeCollaborationHub() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'chat' | 'activity' | 'settings'>('users');
  const [users, setUsers] = useState<CollaboratorUser[]>(SAMPLE_USERS);
  const [activities, setActivities] = useState<CollaborationActivity[]>(SAMPLE_ACTIVITIES);
  const [messages, setMessages] = useState<ChatMessage[]>(SAMPLE_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [cursors, setCursors] = useState<CollaboratorCursor[]>([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const { addLog } = useWorkflowStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Connected users - derived from users state
  const connectedUsers = users.filter(u => u.status === 'online');

  // Format timestamp helper
  const formatTimestamp = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return 'à l\'instant';
    if (minutes < 60) return `il y a ${minutes}min`;
    if (minutes < 1440) return `il y a ${Math.floor(minutes / 60)}h`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  // Simuler les mises à jour temps réel
  useEffect(() => {
    const interval = setInterval(() => {
      // Simuler les curseurs des autres utilisateurs
      const cursors = connectedUsers
        .filter(user => user.status === 'online' && user.id !== '1')
        .map(user => ({
          id: `cursor-${user.id}`,
          userId: user.id,
          username: user.username,
          color: user.role === 'owner' ? '#3B82F6' : user.role === 'editor' ? '#10B981' : '#6B7280',
          position: {
            x: Math.random() * 800 + 100,
            y: Math.random() * 600 + 100
          },
          lastSeen: new Date(),
          isActive: Math.random() > 0.3
        }));
      
      setCursors(cursors);
      
      // Simuler nouvelles activités
      if (Math.random() > 0.7) {
        const newActivity: CollaborationActivity = {
          id: Date.now().toString(),
          userId: '2',
          username: 'Bob Dupont',
          action: 'viewing',
          nodeId: 'node-2',
          timestamp: new Date(),
          details: 'Currently viewing Email node'
        };
        setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [users]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message: ChatMessage = {
        id: Date.now().toString(),
        userId: '1',
        username: 'You',
        message: newMessage.trim(),
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      
      addLog({
        level: 'info',
        message: 'Message envoyé dans le chat collaboratif',
        data: { message: newMessage.trim() }
      });
    }
  };

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    addLog({
      level: 'info',
      message: isScreenSharing ? 'Partage d\'écran arrêté' : 'Partage d\'écran démarré',
      data: { screenSharing: !isScreenSharing }
    });
  };

  const toggleVideoCall = () => {
    setIsVideoCall(!isVideoCall);
    addLog({
      level: 'info',
      message: isVideoCall ? 'Appel vidéo terminé' : 'Appel vidéo démarré',
      data: { videoCall: !isVideoCall }
    });
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'owner': return <Crown size={14} className="text-yellow-500" />;
      case 'editor': return <Edit size={14} className="text-green-500" />;
      case 'viewer': return <Eye size={14} className="text-gray-500" />;
      default: return <Shield size={14} className="text-gray-500" />;
    }
  };

  const getStatusColor = (status: 'online' | 'away' | 'offline') => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getRelativeTime = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    
    if (minutes < 1) return 'à l\'instant';
    if (minutes < 60) return `il y a ${minutes}min`;
    if (minutes < 1440) return `il y a ${Math.floor(minutes / 60)}h`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Curseurs collaboratifs */}
      <div className="fixed inset-0 pointer-events-none z-40">
        {cursors.map(cursor => cursor.isActive && (
          <div
            key={cursor.id}
            className="absolute pointer-events-none transition-all duration-200"
            style={{
              left: cursor.position.x,
              top: cursor.position.y,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="flex items-center space-x-2">
              <MousePointer size={16} style={{ color: cursor.color }} />
              <div 
                className="px-2 py-1 rounded-full text-xs text-white shadow-lg"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.username}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bouton d'ouverture */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-colors z-50 flex items-center space-x-2"
      >
        <Users size={20} />
        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px]">
          {users.filter(u => u.status === 'online').length}
        </span>
        {unreadCount > 0 && (
          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px]">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Panel de collaboration */}
      {isOpen && (
        <div className="fixed top-16 right-4 w-80 bg-white rounded-lg shadow-2xl border z-50 max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users size={20} />
                <h3 className="font-semibold">Collaboration Hub</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleVideoCall}
                  className={`p-2 rounded-full transition-colors ${
                    isVideoCall ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  title="Appel vidéo"
                >
                  <Video size={16} />
                </button>
                <button
                  onClick={toggleScreenShare}
                  className={`p-2 rounded-full transition-colors ${
                    isScreenSharing ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  title="Partage d'écran"
                >
                  <Monitor size={16} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:text-gray-300"
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            {[
              { id: 'users' as const, label: 'Utilisateurs', icon: Users },
              { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
              { id: 'activity' as const, label: 'Activité', icon: Activity },
              { id: 'settings' as const, label: 'Paramètres', icon: Settings }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-1 p-3 text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="h-96 overflow-y-auto">
            {activeTab === 'users' && (
              <div className="p-4 space-y-3">
                {users.map(user => (
                  <div key={user.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-lg">
                        {user.avatar}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(user.status)}`}></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">{user.username}</span>
                        {getRoleIcon(user.role)}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span className="capitalize">{user.status}</span>
                        <span>•</span>
                        <span>{formatTimestamp(user.lastActivity)}</span>
                      </div>
                      {user.currentNode && (
                        <div className="text-xs text-blue-600 mt-1">
                          📍 Editing {user.currentNode}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                  {messages.map(message => (
                    <div key={message.id} className="flex space-x-2">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm">
                        {message.username[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{message.username}</span>
                          <span className="text-xs text-gray-500">{formatTimestamp(message.timestamp)}</span>
                        </div>
                        <div className="text-sm">
                          {message.type === 'node-reference' ? (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-1">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-blue-700">Référence: {message.nodeId}</span>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-1">{message.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-4 border-t">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Tapez votre message..."
                      className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    >
                      Envoyer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="p-4 space-y-3">
                {activities.map(activity => (
                  <div key={activity.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mt-1">
                      <Activity size={14} className="text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm">
                        <span className="font-medium">{activity.username}</span>
                        <span className="text-gray-600"> {activity.action} </span>
                        {activity.nodeId && (
                          <span className="text-blue-600">{activity.nodeId}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{activity.details}</div>
                      <div className="text-xs text-gray-400 mt-1">{formatTimestamp(activity.timestamp)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="p-4 space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Permissions</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">Partage d'écran</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">Appels vidéo</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">Curseurs collaboratifs</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">Notifications temps réel</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Notifications</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">Messages chat</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">Modifications workflow</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">Connexions/Déconnexions</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Lien d'invitation</h4>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value="https://workflow.app/invite/abc123"
                      readOnly
                      className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 text-sm"
                    />
                    <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
                      Copier
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}