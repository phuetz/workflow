/**
 * Workflow Sharing Hub - Simplified version
 * Comprehensive interface for managing workflow sharing, public URLs, and analytics
 */

import React, { useState, useEffect } from 'react';
import {
  Share2,
  Globe,
  Lock,
  Eye,
  Download,
  Play,
  MessageSquare,
  BarChart3,
  Settings,
  Copy,
  QrCode,
  Calendar,
  TrendingUp,
  Trash2,
  Search,
  ExternalLink,
  X
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { SharingService } from '../../services/SharingService';
import type {
  SharedWorkflow,
  CreateShareOptions,
  SharePermissions,
  ShareSettings,
  ShareAnalytics,
  ShareTemplate,
  ShareComment,
  ShareActivity,
  ShareStats,
  ShareEmbedConfig
} from '../../types/sharing';
import { logger } from '../../services/SimpleLogger';

const WorkflowSharingHub: React.FC = () => {
  const { darkMode, workflows: workflowsObject } = useWorkflowStore();
  // Convert workflows object to array for iteration
  const workflows = Object.values(workflowsObject || {});
  const [shares, setShares] = useState<SharedWorkflow[]>([]);
  const [selectedShare, setSelectedShare] = useState<SharedWorkflow | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'shares' | 'analytics' | 'settings'>('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [templates, setTemplates] = useState<ShareTemplate[]>([]);
  const [stats, setStats] = useState<ShareStats | null>(null);
  const [analytics, setAnalytics] = useState<ShareAnalytics | null>(null);
  const [comments, setComments] = useState<ShareComment[]>([]);
  const [activities, setActivities] = useState<ShareActivity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired'>('all');

  const sharingService = SharingService.getInstance();

  useEffect(() => {
    loadSharingData();
  }, []);

  const loadSharingData = async () => {
    try {
      const [sharesData, templatesData, statsData] = await Promise.all([
        sharingService.listShares(),
        sharingService.listTemplates(),
        sharingService.getShareStats()
      ]);
      setShares(sharesData);
      setTemplates(templatesData);
      setStats(statsData);
    } catch (error) {
      logger.error('Failed to load sharing data:', error);
    }
  };

  const loadAnalytics = async (share: SharedWorkflow) => {
    try {
      const [analyticsData, commentsData, activitiesData] = await Promise.all([
        sharingService.getAnalytics(share.shareId),
        sharingService.getComments(share.shareId),
        sharingService.getActivityLog(share.shareId)
      ]);
      setAnalytics(analyticsData);
      setComments(commentsData);
      setActivities(activitiesData);
    } catch (error) {
      logger.error('Failed to load analytics:', error);
    }
  };

  const createShare = async (workflowId: string, options: CreateShareOptions) => {
    try {
      const newShare = await sharingService.createShare(workflowId, options);
      setShares(prev => [...prev, newShare]);
      setShowCreateModal(false);
    } catch (error) {
      logger.error('Failed to create share:', error);
    }
  };

  const deleteShare = async (shareId: string) => {
    if (!confirm('Are you sure you want to delete this share?')) return;

    try {
      await sharingService.deleteShare(shareId);
      setShares(prev => prev.filter(s => s.shareId !== shareId));
      if (selectedShare?.shareId === shareId) {
        setSelectedShare(null);
      }
    } catch (error) {
      logger.error('Failed to delete share:', error);
    }
  };

  const toggleShare = async (shareId: string) => {
    try {
      const share = shares.find(s => s.shareId === shareId);
      if (!share) return;
      
      const updated = await sharingService.updateShare(shareId, {
        isActive: !share.isActive
      });
      
      setShares(prev => prev.map(s => 
        s.shareId === shareId ? updated : s
      ));
    } catch (error) {
      logger.error('Failed to toggle share:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Show success notification
  };

  const generateEmbedCode = (shareId: string) => {
    const embedCode = `<iframe 
  src="${window.location.origin}/embed/${shareId}"
  width="100%"
  height="600"
  frameborder="0"
  allowfullscreen
></iframe>`;
    copyToClipboard(embedCode);
    return embedCode;
  };

  const generateQRCode = async (shareId: string) => {
    try {
      const qrCode = await sharingService.generateQRCode(shareId);
      // Handle QR code display/download
      return qrCode;
    } catch (error) {
      logger.error('Failed to generate QR code:', error);
    }
  };

  const filteredShares = shares.filter(share => {
    const matchesSearch =
      share.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      share.workflowName.toLowerCase().includes(searchQuery.toLowerCase());

    const isExpired = share.expiresAt ? new Date(share.expiresAt) < new Date() : false;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && share.isActive) ||
      (filterStatus === 'expired' && isExpired);

    return matchesSearch && matchesStatus;
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getShareStatusColor = (share: SharedWorkflow) => {
    if (!share.isActive) return 'text-gray-500';
    const isExpired = share.expiresAt ? new Date(share.expiresAt) < new Date() : false;
    if (isExpired) return 'text-red-500';
    return 'text-green-500';
  };

  const getShareStatus = (share: SharedWorkflow) => {
    if (!share.isActive) return 'Inactive';
    const isExpired = share.expiresAt ? new Date(share.expiresAt) < new Date() : false;
    if (isExpired) return 'Expired';
    return 'Active';
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} pt-20`}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Workflow Sharing Hub
              </h1>
              <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Share workflows with your team and the community
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Share2 size={20} />
              Create Share
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex space-x-1 p-1 rounded-lg mb-8 ${
          darkMode ? 'bg-gray-800' : 'bg-gray-100'
        }`}>
          {(['overview', 'shares', 'analytics', 'settings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === tab
                  ? darkMode
                    ? 'bg-gray-700 text-white'
                    : 'bg-white text-gray-900 shadow'
                  : darkMode
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats Cards */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Total Shares
                </h3>
                <Share2 className="text-blue-500" size={20} />
              </div>
              <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {shares.length}
              </p>
              <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {shares.filter(s => s.isActive).length} active
              </p>
            </div>

            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Total Views
                </h3>
                <Eye className="text-green-500" size={20} />
              </div>
              <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {formatNumber(stats?.totalViews || 0)}
              </p>
              <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                All time views
              </p>
            </div>

            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Total Runs
                </h3>
                <Play className="text-purple-500" size={20} />
              </div>
              <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {formatNumber(stats?.totalExecutions || 0)}
              </p>
              <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                All time executions
              </p>
            </div>
          </div>
        )}

        {activeTab === 'shares' && (
          <div className="space-y-6">
            {/* Search and Filter */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search shares..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg ${
                    darkMode
                      ? 'bg-gray-800 text-white border-gray-700'
                      : 'bg-white text-gray-900 border-gray-300'
                  } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                className={`px-4 py-2 rounded-lg ${
                  darkMode
                    ? 'bg-gray-800 text-white border-gray-700'
                    : 'bg-white text-gray-900 border-gray-300'
                } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {/* Shares List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredShares.map(share => (
                <div
                  key={share.shareId}
                  className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow hover:shadow-lg transition-shadow`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {share.title || share.workflowName}
                      </h3>
                      <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {share.description || 'No description'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getShareStatusColor(share)}`}>
                      {getShareStatus(share)}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="text-gray-400" size={16} />
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                        {share.permissions.requireAuth ? 'Private' : 'Public'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Eye className="text-gray-400" size={16} />
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                        {formatNumber(share.analytics.totalViews || 0)} views
                      </span>
                    </div>
                    {share.expiresAt && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="text-gray-400" size={16} />
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                          Expires: {new Date(share.expiresAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedShare(share);
                        loadAnalytics(share);
                        setShowShareModal(true);
                      }}
                      className={`flex-1 py-2 rounded font-medium transition-colors ${
                        darkMode
                          ? 'bg-gray-700 hover:bg-gray-600 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                      }`}
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => copyToClipboard(share.publicUrl)}
                      className="p-2 rounded hover:bg-gray-700 transition-colors"
                      title="Copy URL"
                    >
                      <Copy size={18} />
                    </button>
                    <button
                      onClick={() => toggleShare(share.shareId)}
                      className="p-2 rounded hover:bg-gray-700 transition-colors"
                      title={share.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {share.isActive ? <Lock size={18} /> : <Globe size={18} />}
                    </button>
                    <button
                      onClick={() => deleteShare(share.shareId)}
                      className="p-2 rounded hover:bg-red-700 transition-colors text-red-500"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modals */}
        {showCreateModal && (
          <CreateShareModal
            workflows={workflows}
            templates={templates}
            onClose={() => setShowCreateModal(false)}
            onCreate={createShare}
            darkMode={darkMode}
          />
        )}

        {showShareModal && selectedShare && (
          <ShareDetailsModal
            share={selectedShare}
            analytics={analytics}
            comments={comments}
            activities={activities}
            onClose={() => setShowShareModal(false)}
            onCopy={copyToClipboard}
            onGenerateEmbed={generateEmbedCode}
            onGenerateQR={generateQRCode}
            darkMode={darkMode}
          />
        )}
      </div>
    </div>
  );
};

// Create Share Modal Component
interface CreateShareModalProps {
  workflows: unknown[];
  templates: ShareTemplate[];
  onClose: () => void;
  onCreate: (workflowId: string, options: CreateShareOptions) => void;
  darkMode: boolean;
}

const CreateShareModal: React.FC<CreateShareModalProps> = ({ 
  workflows, 
  templates, 
  onClose, 
  onCreate, 
  darkMode 
}) => {
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [permissions, setPermissions] = useState<Partial<SharePermissions>>({});
  const [settings, setSettings] = useState<Partial<ShareSettings>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkflow) return;

    onCreate(selectedWorkflow, {
      title,
      description,
      templateId: selectedTemplate || undefined,
      permissions,
      settings
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Create Share
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Select Workflow
              </label>
              <select
                value={selectedWorkflow}
                onChange={(e) => setSelectedWorkflow(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg ${
                  darkMode
                    ? 'bg-gray-700 text-white border-gray-600'
                    : 'bg-white text-gray-900 border-gray-300'
                } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                required
              >
                <option value="">Select a workflow...</option>
                {workflows.map((workflow: any) => (
                  <option key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for the share"
                className={`w-full px-4 py-2 rounded-lg ${
                  darkMode
                    ? 'bg-gray-700 text-white border-gray-600'
                    : 'bg-white text-gray-900 border-gray-300'
                } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this workflow does"
                rows={3}
                className={`w-full px-4 py-2 rounded-lg ${
                  darkMode
                    ? 'bg-gray-700 text-white border-gray-600'
                    : 'bg-white text-gray-900 border-gray-300'
                } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Create Share
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Share Details Modal Component
interface ShareDetailsModalProps {
  share: SharedWorkflow;
  analytics: ShareAnalytics | null;
  comments: ShareComment[];
  activities: ShareActivity[];
  onClose: () => void;
  onCopy: (text: string) => void;
  onGenerateEmbed: (shareId: string) => string;
  onGenerateQR: (shareId: string) => void;
  darkMode: boolean;
}

const ShareDetailsModal: React.FC<ShareDetailsModalProps> = ({ 
  share, 
  analytics, 
  comments, 
  activities, 
  onClose, 
  onCopy, 
  onGenerateEmbed, 
  onGenerateQR, 
  darkMode 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'comments' | 'activity'>('overview');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {share.title || share.workflowName}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className={`flex space-x-1 p-1 rounded-lg mb-6 ${
            darkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            {(['overview', 'analytics', 'comments', 'activity'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  activeTab === tab
                    ? darkMode
                      ? 'bg-gray-600 text-white'
                      : 'bg-white text-gray-900 shadow'
                    : darkMode
                      ? 'text-gray-400 hover:text-white'
                      : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Share URL
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={share.publicUrl}
                    readOnly
                    className={`flex-1 px-4 py-2 rounded-lg ${
                      darkMode
                        ? 'bg-gray-700 text-white border-gray-600'
                        : 'bg-gray-100 text-gray-900 border-gray-300'
                    } border`}
                  />
                  <button
                    onClick={() => onCopy(share.publicUrl)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => onGenerateEmbed(share.shareId)}
                  className={`p-4 rounded-lg border ${
                    darkMode
                      ? 'border-gray-700 hover:bg-gray-700'
                      : 'border-gray-300 hover:bg-gray-50'
                  } transition-colors`}
                >
                  <div className="flex items-center gap-3">
                    <ExternalLink className="text-blue-500" size={24} />
                    <div className="text-left">
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Generate Embed
                      </p>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Get HTML embed code
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => onGenerateQR(share.shareId)}
                  className={`p-4 rounded-lg border ${
                    darkMode
                      ? 'border-gray-700 hover:bg-gray-700'
                      : 'border-gray-300 hover:bg-gray-50'
                  } transition-colors`}
                >
                  <div className="flex items-center gap-3">
                    <QrCode className="text-purple-500" size={24} />
                    <div className="text-left">
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Generate QR Code
                      </p>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Create QR code
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowSharingHub;