/**
 * API Dashboard
 * Comprehensive interface for managing API keys, documentation, and CLI access
 */

import React, { useState, useRef } from 'react';
import {
  Key,
  Terminal,
  FileText,
  Plus,
  Webhook,
  BarChart3
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { APIService } from '../../services/APIService';
import type { APIKey } from '../../types/api';
import {
  APIKeysTab,
  APIDocsTab,
  APICLITab,
  CreateAPIKeyModal,
  NewAPIKeyModal,
  UsageModal,
  useAPIData,
  useAPIMetrics
} from './api';
import type { APITabKey, CreateAPIKeyOptions } from './api';

const TABS = [
  { key: 'keys' as APITabKey, label: 'API Keys', icon: Key },
  { key: 'docs' as APITabKey, label: 'Documentation', icon: FileText },
  { key: 'cli' as APITabKey, label: 'CLI', icon: Terminal },
  { key: 'webhooks' as APITabKey, label: 'Webhooks', icon: Webhook },
  { key: 'analytics' as APITabKey, label: 'Analytics', icon: BarChart3 }
];

export default function APIDashboard() {
  const { darkMode } = useWorkflowStore();
  const apiService = APIService.getInstance();
  const copyRef = useRef<HTMLInputElement>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<APITabKey>('keys');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<APIKey | null>(null);

  // Hooks for data management
  const {
    filteredKeys,
    endpoints,
    searchQuery,
    filterEnv,
    setSearchQuery,
    setFilterEnv,
    createAPIKey: createKey,
    deleteAPIKey: deleteKey,
    rotateAPIKey: rotateKey
  } = useAPIData();

  const { usage, loadUsageData } = useAPIMetrics();

  // Copy to clipboard utility
  const copyToClipboard = (text: string) => {
    if (copyRef.current) {
      copyRef.current.value = text;
      copyRef.current.select();
      document.execCommand('copy');
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  // Handle create API key
  const handleCreateAPIKey = async (options: CreateAPIKeyOptions) => {
    const key = await createKey(options);
    if (key) {
      setNewApiKey(key);
      setShowCreateModal(false);
      setShowKeyModal(true);
    }
  };

  // Handle delete API key
  const handleDeleteAPIKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }
    await deleteKey(keyId);
  };

  // Handle rotate API key
  const handleRotateAPIKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to rotate this API key? The old key will stop working immediately.')) {
      return;
    }
    const key = await rotateKey(keyId);
    if (key) {
      setNewApiKey(key);
      setShowKeyModal(true);
    }
  };

  // Handle view usage
  const handleViewUsage = (key: APIKey) => {
    setSelectedKey(key);
    loadUsageData(key.id);
    setShowUsageModal(true);
  };

  // Handle download OpenAPI spec
  const handleDownloadSpec = async () => {
    const spec = await apiService.getOpenAPISpec();
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workflow-api-spec.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} pt-20`}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <DashboardHeader
          darkMode={darkMode}
          onCreateKey={() => setShowCreateModal(true)}
        />

        {/* Tabs */}
        <TabNavigation
          darkMode={darkMode}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Tab Content */}
        {activeTab === 'keys' && (
          <APIKeysTab
            darkMode={darkMode}
            filteredKeys={filteredKeys}
            searchQuery={searchQuery}
            filterEnv={filterEnv}
            onSearchChange={setSearchQuery}
            onFilterChange={setFilterEnv}
            onViewUsage={handleViewUsage}
            onRotateKey={handleRotateAPIKey}
            onDeleteKey={handleDeleteAPIKey}
            onCopy={copyToClipboard}
          />
        )}

        {activeTab === 'docs' && (
          <APIDocsTab
            darkMode={darkMode}
            endpoints={endpoints}
            onCopy={copyToClipboard}
            onDownloadSpec={handleDownloadSpec}
          />
        )}

        {activeTab === 'cli' && (
          <APICLITab darkMode={darkMode} onCopy={copyToClipboard} />
        )}

        {activeTab === 'webhooks' && (
          <WebhooksPlaceholder darkMode={darkMode} />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsPlaceholder darkMode={darkMode} />
        )}

        {/* Hidden copy input */}
        <input ref={copyRef} style={{ position: 'absolute', left: '-9999px' }} />

        {/* Modals */}
        {showCreateModal && (
          <CreateAPIKeyModal
            darkMode={darkMode}
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateAPIKey}
          />
        )}

        {showKeyModal && newApiKey && (
          <NewAPIKeyModal
            darkMode={darkMode}
            apiKey={newApiKey}
            onClose={() => {
              setShowKeyModal(false);
              setNewApiKey(null);
            }}
            onCopy={copyToClipboard}
          />
        )}

        {showUsageModal && selectedKey && usage && (
          <UsageModal
            darkMode={darkMode}
            apiKey={selectedKey}
            usage={usage}
            onClose={() => setShowUsageModal(false)}
          />
        )}
      </div>
    </div>
  );
}

// Sub-components

interface DashboardHeaderProps {
  darkMode: boolean;
  onCreateKey: () => void;
}

function DashboardHeader({ darkMode, onCreateKey }: DashboardHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
            API Dashboard
          </h1>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage API keys, view documentation, and monitor usage
          </p>
        </div>
        <button
          onClick={onCreateKey}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Create API Key</span>
        </button>
      </div>
    </div>
  );
}

interface TabNavigationProps {
  darkMode: boolean;
  activeTab: APITabKey;
  onTabChange: (tab: APITabKey) => void;
}

function TabNavigation({ darkMode, activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="mb-6">
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                : darkMode
                ? 'text-gray-400 hover:text-gray-300'
                : 'text-gray-600 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface PlaceholderProps {
  darkMode: boolean;
}

function WebhooksPlaceholder({ darkMode }: PlaceholderProps) {
  return (
    <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
      <Webhook size={48} className="mx-auto mb-4 opacity-50" />
      <p>Webhooks management coming soon...</p>
    </div>
  );
}

function AnalyticsPlaceholder({ darkMode }: PlaceholderProps) {
  return (
    <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
      <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
      <p>Analytics dashboard coming soon...</p>
    </div>
  );
}
