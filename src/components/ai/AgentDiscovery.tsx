/**
 * Agent Discovery Component
 *
 * UI for discovering and managing agents in the registry
 */

import React, { useState, useEffect } from 'react';
import { AgentRegistry, AgentInfo, AgentStatus, AgentQuery } from '../../protocols/AgentRegistry';

interface AgentDiscoveryProps {
  registry: AgentRegistry;
}

const AgentDiscovery: React.FC<AgentDiscoveryProps> = ({ registry }) => {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<AgentInfo[]>([]);
  const [stats, setStats] = useState<{
    totalAgents: number;
    online: number;
    offline: number;
    degraded: number;
    unknown: number;
    byType: Record<string, number>;
    byProtocol: Record<string, number>;
    capabilities: string[];
    avgResponseTime: number;
    avgLoad: number;
  } | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AgentStatus[]>([]);
  const [capabilityFilter, setCapabilityFilter] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('');

  useEffect(() => {
    loadAgents();

    // Update every 5 seconds
    const interval = setInterval(() => {
      loadAgents();
    }, 5000);

    return () => clearInterval(interval);
  }, [registry]);

  useEffect(() => {
    applyFilters();
  }, [agents, searchTerm, statusFilter, capabilityFilter, protocolFilter]);

  const loadAgents = () => {
    setAgents(registry.getAllAgents());
    setStats(registry.getStats());
  };

  const applyFilters = () => {
    let filtered = [...agents];

    // Search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(agent =>
        agent.name.toLowerCase().includes(term) ||
        agent.id.toLowerCase().includes(term) ||
        agent.type.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter.length > 0) {
      filtered = filtered.filter(agent => statusFilter.includes(agent.status));
    }

    // Capability filter
    if (capabilityFilter) {
      filtered = filtered.filter(agent =>
        agent.capabilities.some(cap =>
          cap.toLowerCase().includes(capabilityFilter.toLowerCase())
        )
      );
    }

    // Protocol filter
    if (protocolFilter) {
      filtered = filtered.filter(agent =>
        agent.protocols.some(p =>
          p.toLowerCase().includes(protocolFilter.toLowerCase())
        )
      );
    }

    setFilteredAgents(filtered);
  };

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case AgentStatus.ONLINE:
        return 'bg-green-100 text-green-800';
      case AgentStatus.OFFLINE:
        return 'bg-red-100 text-red-800';
      case AgentStatus.DEGRADED:
        return 'bg-yellow-100 text-yellow-800';
      case AgentStatus.UNKNOWN:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case AgentStatus.ONLINE:
        return '✓';
      case AgentStatus.OFFLINE:
        return '✗';
      case AgentStatus.DEGRADED:
        return '⚠';
      case AgentStatus.UNKNOWN:
        return '?';
      default:
        return '?';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) {
      return 'Just now';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleUnregister = (agentId: string) => {
    if (confirm('Are you sure you want to unregister this agent?')) {
      registry.unregister(agentId);
      loadAgents();
      setSelectedAgent(null);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Agent Discovery</h2>

      {/* Statistics */}
      {stats && (
        <div className="mb-6 grid grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600">Total Agents</div>
            <div className="text-3xl font-bold">{stats.totalAgents}</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-gray-600">Online</div>
            <div className="text-3xl font-bold text-green-600">{stats.online}</div>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <div className="text-sm text-gray-600">Degraded</div>
            <div className="text-3xl font-bold text-yellow-600">{stats.degraded}</div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="text-sm text-gray-600">Offline</div>
            <div className="text-3xl font-bold text-red-600">{stats.offline}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 space-y-3">
        <div className="flex space-x-3">
          <input
            type="text"
            placeholder="Search agents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Filter by capability..."
            value={capabilityFilter}
            onChange={(e) => setCapabilityFilter(e.target.value)}
            className="w-48 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Filter by protocol..."
            value={protocolFilter}
            onChange={(e) => setProtocolFilter(e.target.value)}
            className="w-48 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex space-x-2">
          <span className="text-sm font-medium text-gray-700 py-2">Status:</span>
          {(Object.values(AgentStatus) as AgentStatus[]).map((status: AgentStatus) => (
            <button
              key={status}
              onClick={() => {
                if (statusFilter.includes(status)) {
                  setStatusFilter(statusFilter.filter(s => s !== status));
                } else {
                  setStatusFilter([...statusFilter, status]);
                }
              }}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                statusFilter.includes(status)
                  ? getStatusColor(status)
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Agent List */}
      <div className="grid grid-cols-2 gap-4">
        {filteredAgents.map(agent => (
          <div
            key={agent.id}
            onClick={() => setSelectedAgent(agent)}
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selectedAgent?.id === agent.id
                ? 'border-blue-500 shadow-lg'
                : 'hover:shadow-md'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg">{agent.name}</h3>
                <p className="text-sm text-gray-600">{agent.type}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full flex items-center ${getStatusColor(agent.status)}`}>
                <span className="mr-1">{getStatusIcon(agent.status)}</span>
                {agent.status}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Response Time:</span>
                <span className="font-medium">
                  {agent.health.responseTime ? `${agent.health.responseTime}ms` : 'N/A'}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Load:</span>
                <span className="font-medium">
                  {agent.health.load !== undefined
                    ? `${(agent.health.load * 100).toFixed(0)}%`
                    : 'N/A'
                  }
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Last Seen:</span>
                <span className="font-medium">
                  {formatTimestamp(agent.health.lastHeartbeat)}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t">
              <div className="text-xs text-gray-600 mb-1">Capabilities:</div>
              <div className="flex flex-wrap gap-1">
                {agent.capabilities.slice(0, 3).map(cap => (
                  <span
                    key={cap}
                    className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded"
                  >
                    {cap}
                  </span>
                ))}
                {agent.capabilities.length > 3 && (
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                    +{agent.capabilities.length - 3}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No agents found matching your filters
        </div>
      )}

      {/* Agent Details Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold">{selectedAgent.name}</h3>
                <p className="text-gray-600">{selectedAgent.id}</p>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Status</h4>
                <span className={`px-3 py-1 rounded-full ${getStatusColor(selectedAgent.status)}`}>
                  {getStatusIcon(selectedAgent.status)} {selectedAgent.status}
                </span>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Type</h4>
                <p>{selectedAgent.type}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Capabilities</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedAgent.capabilities.map(cap => (
                    <span
                      key={cap}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Protocols</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedAgent.protocols.map(protocol => (
                    <span
                      key={protocol}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded"
                    >
                      {protocol}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Health</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-sm text-gray-600">Response Time</div>
                    <div className="text-lg font-semibold">
                      {selectedAgent.health.responseTime
                        ? `${selectedAgent.health.responseTime}ms`
                        : 'N/A'
                      }
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-sm text-gray-600">Load</div>
                    <div className="text-lg font-semibold">
                      {selectedAgent.health.load !== undefined
                        ? `${(selectedAgent.health.load * 100).toFixed(0)}%`
                        : 'N/A'
                      }
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-sm text-gray-600">Success Rate</div>
                    <div className="text-lg font-semibold">
                      {selectedAgent.health.successRate !== undefined
                        ? `${(selectedAgent.health.successRate * 100).toFixed(1)}%`
                        : 'N/A'
                      }
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-sm text-gray-600">Error Rate</div>
                    <div className="text-lg font-semibold">
                      {selectedAgent.health.errorRate !== undefined
                        ? `${(selectedAgent.health.errorRate * 100).toFixed(1)}%`
                        : 'N/A'
                      }
                    </div>
                  </div>
                </div>
              </div>

              {selectedAgent.metadata && Object.keys(selectedAgent.metadata).length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Metadata</h4>
                  <pre className="p-3 bg-gray-50 rounded text-sm overflow-x-auto">
                    {JSON.stringify(selectedAgent.metadata, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex space-x-3 pt-4 border-t">
                <button
                  onClick={() => handleUnregister(selectedAgent.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Unregister
                </button>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentDiscovery;
