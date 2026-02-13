/**
 * MCP Dashboard Component
 * Overview and management of MCP servers and tools
 */

import React, { useState, useEffect } from 'react';
import {
  Server,
  Activity,
  Zap,
  Database,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import type {
  MCPServerConnection,
  MCPOrchestratorStats,
  MCPTool,
  MCPResource,
} from '../../types/mcp';

interface MCPDashboardProps {
  connections: MCPServerConnection[];
  stats: MCPOrchestratorStats;
  tools: MCPTool[];
  resources: MCPResource[];
  onRefresh?: () => void;
  darkMode?: boolean;
}

export const MCPDashboard: React.FC<MCPDashboardProps> = ({
  connections,
  stats,
  tools,
  resources,
  onRefresh,
  darkMode = false,
}) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'servers' | 'tools' | 'resources'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'connected':
        return 'text-green-500';
      case 'connecting':
      case 'reconnecting':
        return 'text-yellow-500';
      case 'disconnected':
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'connected':
        return <CheckCircle className="w-5 h-5" />;
      case 'connecting':
      case 'reconnecting':
        return <Clock className="w-5 h-5 animate-spin" />;
      case 'disconnected':
      case 'failed':
        return <XCircle className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const filteredTools = tools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredResources = resources.filter(
    (resource) =>
      resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.uri.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">MCP Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Model Context Protocol Integration</p>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-6">
          {['overview', 'servers', 'tools', 'resources'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab as typeof selectedTab)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTab === tab
                  ? 'bg-blue-600 text-white'
                  : darkMode
                  ? 'hover:bg-gray-700'
                  : 'hover:bg-gray-100'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                icon={<Server className="w-6 h-6 text-white" />}
                title="Total Servers"
                value={stats.totalServers}
                subtitle={`${stats.connectedServers} connected`}
                color="bg-blue-500"
                darkMode={darkMode}
              />
              <StatsCard
                icon={<Zap className="w-6 h-6 text-white" />}
                title="Total Tools"
                value={stats.totalTools}
                subtitle="Available tools"
                color="bg-green-500"
                darkMode={darkMode}
              />
              <StatsCard
                icon={<Database className="w-6 h-6 text-white" />}
                title="Total Resources"
                value={stats.totalResources}
                subtitle="Available resources"
                color="bg-purple-500"
                darkMode={darkMode}
              />
              <StatsCard
                icon={<Activity className="w-6 h-6 text-white" />}
                title="Requests"
                value={stats.requestsProcessed}
                subtitle={`${stats.failovers} failovers`}
                color="bg-orange-500"
                darkMode={darkMode}
              />
            </div>

            {/* Performance Metrics */}
            <div className={`rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Performance Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Average Latency</p>
                  <p className="text-2xl font-bold">{stats.averageLatency.toFixed(2)}ms</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Success Rate</p>
                  <p className="text-2xl font-bold">
                    {stats.requestsProcessed > 0
                      ? (((stats.requestsProcessed - stats.failovers) / stats.requestsProcessed) * 100).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Failover Rate</p>
                  <p className="text-2xl font-bold">
                    {stats.requestsProcessed > 0
                      ? ((stats.failovers / stats.requestsProcessed) * 100).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </div>

            {/* Server Status */}
            <div className={`rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
              <h3 className="text-lg font-semibold mb-4">Server Status</h3>
              <div className="space-y-3">
                {connections.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No servers connected</p>
                ) : (
                  connections.map((conn) => (
                    <div
                      key={conn.id}
                      className={`p-4 rounded-lg border ${
                        darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={getStatusColor(conn.status.state)}>{getStatusIcon(conn.status.state)}</div>
                          <div>
                            <p className="font-medium">{conn.name}</p>
                            <p className="text-sm text-gray-500">{conn.url}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {conn.tools?.length || 0} tools • {conn.resources?.length || 0} resources
                          </p>
                          {conn.lastPing && (
                            <p className="text-xs text-gray-400">
                              Last ping: {new Date(conn.lastPing).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'servers' && (
          <div className="space-y-4">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className={`rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <div className={getStatusColor(conn.status.state)}>{getStatusIcon(conn.status.state)}</div>
                      {conn.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{conn.url}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      conn.status.state === 'connected'
                        ? 'bg-green-100 text-green-800'
                        : conn.status.state === 'connecting' || conn.status.state === 'reconnecting'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {conn.status.state}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Tools</p>
                    <p className="text-xl font-bold">{conn.tools?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Resources</p>
                    <p className="text-xl font-bold">{conn.resources?.length || 0}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">Capabilities</p>
                  <div className="flex flex-wrap gap-2">
                    {conn.capabilities.tools && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Tools</span>
                    )}
                    {conn.capabilities.resources && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">Resources</span>
                    )}
                    {conn.capabilities.prompts && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Prompts</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedTab === 'tools' && (
          <div>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                } focus:outline-none focus:border-blue-500`}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTools.map((tool) => (
                <div
                  key={tool.name}
                  className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}
                >
                  <h4 className="font-semibold mb-2">{tool.name}</h4>
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{tool.description}</p>
                  <div className="text-xs text-gray-400">
                    {Object.keys(tool.inputSchema.properties).length} parameters
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTab === 'resources' && (
          <div>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                } focus:outline-none focus:border-blue-500`}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredResources.map((resource) => (
                <div
                  key={resource.uri}
                  className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}
                >
                  <h4 className="font-semibold mb-2">{resource.name}</h4>
                  <p className="text-sm text-gray-500 mb-2">{resource.uri}</p>
                  {resource.description && (
                    <p className="text-sm text-gray-400 mb-2">{resource.description}</p>
                  )}
                  {resource.mimeType && (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {resource.mimeType}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface StatsCardProps {
  icon: React.ReactNode;
  title: string;
  value: number | string;
  subtitle: string;
  color: string;
  darkMode: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({ icon, title, value, subtitle, color, darkMode }) => {
  return (
    <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      <div className="flex items-center mb-3">
        <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center`}>{icon}</div>
      </div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
};
