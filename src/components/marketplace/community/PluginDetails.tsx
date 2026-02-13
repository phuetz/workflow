/**
 * Plugin Details Modal Component
 * Full details view of a community node
 */

import React, { useState } from 'react';
import {
  X,
  GitBranch,
  Download,
  Star,
  Users,
  Clock,
  Shield,
  CheckCircle,
  AlertTriangle,
  User
} from 'lucide-react';
import type { NodeDetailsModalProps } from './types';
import { formatNumber, formatTimeAgo, getNodeIcon, getThemeClasses } from './utils';

type TabType = 'overview' | 'documentation' | 'reviews';

function PluginDetails({
  node,
  isInstalled,
  onClose,
  onInstall,
  onUninstall,
  darkMode
}: NodeDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const theme = getThemeClasses(darkMode);

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'documentation' as const, label: 'Documentation' },
    { key: 'reviews' as const, label: `Reviews (${node.ratings.count})` }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${theme.bg} rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`p-6 border-b ${theme.border}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${node.color}20`, color: node.color }}
              >
                {getNodeIcon(node.icon)}
              </div>
              <div>
                <h2 className={`text-2xl font-semibold ${theme.text}`}>
                  {node.displayName}
                </h2>
                <div className="flex items-center space-x-3 mt-1">
                  <span className={`text-sm ${theme.textSecondary}`}>
                    by {node.author.displayName}
                  </span>
                  {node.author.verified && <CheckCircle size={14} className="text-blue-500" />}
                  <span className={`text-sm ${theme.textMuted}`}>
                    v{node.version}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg ${theme.hover} transition-colors`}
            >
              <X size={20} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 mt-4">
            {isInstalled ? (
              <button
                onClick={onUninstall}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Uninstall
              </button>
            ) : (
              <button
                onClick={onInstall}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Install Node
              </button>
            )}
            <button
              onClick={() => window.open(node.repository.url, '_blank')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${theme.bgSecondary} ${theme.hover} ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              <GitBranch size={16} className="inline mr-2" />
              View Source
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mt-6">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-500 text-white'
                    : darkMode
                      ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                      : 'text-gray-600 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <OverviewTab node={node} darkMode={darkMode} />
          )}
          {activeTab === 'documentation' && (
            <DocumentationTab readme={node.documentation.readme} darkMode={darkMode} />
          )}
          {activeTab === 'reviews' && (
            <ReviewsTab reviews={node.ratings.reviews} darkMode={darkMode} />
          )}
        </div>
      </div>
    </div>
  );
}

// Overview Tab
function OverviewTab({ node, darkMode }: { node: NodeDetailsModalProps['node']; darkMode: boolean }) {
  const theme = getThemeClasses(darkMode);

  return (
    <div className="space-y-6">
      {/* Description */}
      <div>
        <h3 className={`text-lg font-medium mb-3 ${theme.text}`}>Description</h3>
        <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{node.description}</p>
      </div>

      {/* Stats */}
      <div>
        <h3 className={`text-lg font-medium mb-3 ${theme.text}`}>Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Download size={16} className="text-blue-500" />}
            label="Downloads"
            value={formatNumber(node.stats.downloads.total)}
            subValue={`${formatNumber(node.stats.downloads.weekly)} this week`}
            darkMode={darkMode}
          />
          <StatCard
            icon={<Star size={16} className="text-yellow-500" />}
            label="Rating"
            value={node.ratings.average.toFixed(1)}
            subValue={`${node.ratings.count} reviews`}
            darkMode={darkMode}
          />
          <StatCard
            icon={<Users size={16} className="text-green-500" />}
            label="Active Users"
            value={formatNumber(node.stats.installations)}
            darkMode={darkMode}
          />
          <StatCard
            icon={<Clock size={16} className="text-purple-500" />}
            label="Last Update"
            value={formatTimeAgo(node.updatedAt)}
            isSmallValue
            darkMode={darkMode}
          />
        </div>
      </div>

      {/* Security */}
      <div>
        <h3 className={`text-lg font-medium mb-3 ${theme.text}`}>Security & Permissions</h3>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            {node.security.verified ? (
              <>
                <CheckCircle size={16} className="text-green-500" />
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Security verified
                </span>
              </>
            ) : (
              <>
                <AlertTriangle size={16} className="text-yellow-500" />
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Not verified
                </span>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Shield size={16} className={theme.textSecondary} />
            <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Requires: {node.security.permissions.join(', ') || 'No special permissions'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  isSmallValue?: boolean;
  darkMode: boolean;
}

function StatCard({ icon, label, value, subValue, isSmallValue, darkMode }: StatCardProps) {
  const theme = getThemeClasses(darkMode);

  return (
    <div className={`${theme.bgSecondary} rounded-lg p-4`}>
      <div className="flex items-center space-x-2 mb-2">
        {icon}
        <span className={`text-sm ${theme.textSecondary}`}>{label}</span>
      </div>
      <p className={`${isSmallValue ? 'text-sm' : 'text-xl'} font-bold ${theme.text}`}>
        {value}
      </p>
      {subValue && (
        <p className={`text-xs ${theme.textMuted}`}>{subValue}</p>
      )}
    </div>
  );
}

// Documentation Tab
function DocumentationTab({ readme, darkMode }: { readme: string; darkMode: boolean }) {
  return (
    <div className={`prose ${darkMode ? 'prose-invert' : ''} max-w-none`}>
      <div className="whitespace-pre-wrap">{readme}</div>
    </div>
  );
}

// Reviews Tab
interface Review {
  id: string;
  userName: string;
  userAvatar?: string;
  verified: boolean;
  rating: number;
  comment: string;
  createdAt: Date | string;
}

function ReviewsTab({ reviews, darkMode }: { reviews: Review[]; darkMode: boolean }) {
  const theme = getThemeClasses(darkMode);

  return (
    <div className="space-y-4">
      {reviews.map(review => (
        <div key={review.id} className={`${theme.bgSecondary} rounded-lg p-4`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-3">
              {review.userAvatar ? (
                <img src={review.userAvatar} alt={review.userName} className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <User size={16} />
                </div>
              )}
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`font-medium ${theme.text}`}>{review.userName}</span>
                  {review.verified && <CheckCircle size={12} className="text-blue-500" />}
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        size={12}
                        className={star <= review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                  <span className={theme.textMuted}>{formatTimeAgo(review.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {review.comment}
          </p>
        </div>
      ))}
    </div>
  );
}

export default PluginDetails;
