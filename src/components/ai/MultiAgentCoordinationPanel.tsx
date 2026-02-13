/**
 * Multi-Agent Coordination Panel
 * Visualization of agent coordination, communication, and resource usage
 *
 * Features:
 * - Agent status grid
 * - Communication graph
 * - Resource utilization charts
 * - Bottleneck alerts
 * - Coordination patterns
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  Activity,
  AlertTriangle,
  Cpu,
  HardDrive,
  Network,
  MessageSquare,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import {
  globalMultiAgentView,
  AgentInfo,
  AgentCommunication,
  BottleneckInfo,
  CoordinationPattern
} from '../../observability/MultiAgentView';

export const MultiAgentCoordinationPanel: React.FC = () => {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [communications, setCommunications] = useState<AgentCommunication[]>([]);
  const [bottlenecks, setBottlenecks] = useState<BottleneckInfo[]>([]);
  const [patterns, setPatterns] = useState<CoordinationPattern[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [stats, setStats] = useState<ReturnType<typeof globalMultiAgentView.getStatistics>>();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load data
   */
  const loadData = useCallback(() => {
    setAgents(globalMultiAgentView.getAgents());
    setCommunications(globalMultiAgentView.getCommunications(undefined, 50));
    setBottlenecks(globalMultiAgentView.getBottlenecks());
    setPatterns(globalMultiAgentView.getCoordinationPatterns());
    setStats(globalMultiAgentView.getStatistics());
  }, []);

  /**
   * Auto-refresh
   */
  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loadData]);

  /**
   * Listen to agent events
   */
  useEffect(() => {
    globalMultiAgentView.on('agent:registered', loadData);
    globalMultiAgentView.on('agent:status_changed', loadData);
    globalMultiAgentView.on('agent:health_changed', loadData);
    globalMultiAgentView.on('communication:recorded', loadData);
    globalMultiAgentView.on('bottleneck:detected', loadData);

    return () => {
      globalMultiAgentView.off('agent:registered', loadData);
      globalMultiAgentView.off('agent:status_changed', loadData);
      globalMultiAgentView.off('agent:health_changed', loadData);
      globalMultiAgentView.off('communication:recorded', loadData);
      globalMultiAgentView.off('bottleneck:detected', loadData);
    };
  }, [loadData]);

  /**
   * Get status icon
   */
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'idle':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'busy':
        return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'waiting':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  /**
   * Get health color
   */
  const getHealthColor = (status: string): string => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'unhealthy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Get severity color
   */
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'low':
        return 'bg-blue-100 text-blue-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Multi-Agent Coordination
          </h2>
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <Activity className="w-3 h-3 animate-pulse" />
            Live
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Users className="w-6 h-6 mx-auto mb-1 text-blue-500" />
              <p className="text-xl font-bold text-blue-900">{stats.totalAgents}</p>
              <p className="text-xs text-blue-600">Total Agents</p>
            </div>

            <div className="text-center p-3 bg-green-50 rounded-lg">
              <Activity className="w-6 h-6 mx-auto mb-1 text-green-500" />
              <p className="text-xl font-bold text-green-900">{stats.activeAgents}</p>
              <p className="text-xs text-green-600">Active</p>
            </div>

            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <MessageSquare className="w-6 h-6 mx-auto mb-1 text-purple-500" />
              <p className="text-xl font-bold text-purple-900">{stats.totalCommunications}</p>
              <p className="text-xs text-purple-600">Messages</p>
            </div>

            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <Clock className="w-6 h-6 mx-auto mb-1 text-yellow-500" />
              <p className="text-xl font-bold text-yellow-900">
                {stats.avgCommunicationDuration.toFixed(0)}ms
              </p>
              <p className="text-xs text-yellow-600">Avg Duration</p>
            </div>

            <div className="text-center p-3 bg-red-50 rounded-lg">
              <AlertTriangle className="w-6 h-6 mx-auto mb-1 text-red-500" />
              <p className="text-xl font-bold text-red-900">{stats.bottleneckCount}</p>
              <p className="text-xs text-red-600">Bottlenecks</p>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Agent List */}
        <div className="w-80 border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Agents</h3>

            {agents.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No agents registered</p>
              </div>
            ) : (
              <div className="space-y-2">
                {agents.map((agent) => (
                  <button
                    key={agent.agentId}
                    onClick={() => setSelectedAgent(agent)}
                    className={`w-full p-3 text-left rounded-lg border transition-colors ${
                      selectedAgent?.agentId === agent.agentId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(agent.status)}
                        <span className="font-medium text-gray-900 text-sm truncate">
                          {agent.name}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getHealthColor(agent.health.status)}`}>
                        {agent.health.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Cpu className="w-3 h-3" />
                        {agent.resources.cpuPercent.toFixed(0)}%
                      </div>
                      <div className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        {agent.resources.memoryMB.toFixed(0)}MB
                      </div>
                      <div className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {agent.resources.queueSize}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Details Panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedAgent ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Select an agent to view details</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Agent Details */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Agent Details
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Agent ID</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedAgent.agentId}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Type</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedAgent.agentType}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(selectedAgent.status)}
                      <span className="text-sm font-medium text-gray-900">
                        {selectedAgent.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Health</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${getHealthColor(selectedAgent.health.status)}`}>
                      {selectedAgent.health.status}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Uptime</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {Math.floor(selectedAgent.health.uptime / 1000 / 60)} minutes
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Error Rate</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {(selectedAgent.health.errorRate * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>

                {/* Capabilities */}
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">Capabilities</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAgent.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Resource Usage */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Resource Usage
                </h3>

                <div className="space-y-4">
                  {/* CPU */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">CPU</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedAgent.resources.cpuPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          selectedAgent.resources.cpuPercent > 80
                            ? 'bg-red-500'
                            : selectedAgent.resources.cpuPercent > 60
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${selectedAgent.resources.cpuPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Memory */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Memory</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedAgent.resources.memoryMB.toFixed(0)}MB
                      </span>
                    </div>
                  </div>

                  {/* Queue */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Queue Size</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedAgent.resources.queueSize} tasks
                      </span>
                    </div>
                  </div>

                  {/* Active Tasks */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Active Tasks</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedAgent.resources.activeTasks}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Communications */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Communications
                </h3>

                <div className="space-y-2">
                  {communications
                    .filter(
                      (c) =>
                        c.fromAgent === selectedAgent.agentId ||
                        c.toAgent === selectedAgent.agentId
                    )
                    .slice(0, 10)
                    .map((comm) => (
                      <div
                        key={comm.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        {comm.success ? (
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {comm.fromAgent === selectedAgent.agentId ? '→' : '←'}{' '}
                            {comm.fromAgent === selectedAgent.agentId
                              ? comm.toAgent
                              : comm.fromAgent}
                          </p>
                          <p className="text-xs text-gray-500">
                            {comm.messageType}
                            {comm.duration && ` • ${comm.duration}ms`}
                          </p>
                        </div>

                        <span className="text-xs text-gray-400">
                          {new Date(comm.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottlenecks Sidebar */}
        {bottlenecks.length > 0 && (
          <div className="w-80 border-l border-gray-200 overflow-y-auto p-4 bg-red-50">
            <h3 className="text-sm font-semibold text-red-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Bottlenecks
            </h3>

            <div className="space-y-2">
              {bottlenecks.map((bottleneck) => (
                <div
                  key={bottleneck.agentId + bottleneck.type}
                  className="p-3 bg-white rounded-lg border border-red-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {bottleneck.agentId}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(bottleneck.severity)}`}>
                      {bottleneck.severity}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 mb-2">
                    {bottleneck.description}
                  </p>

                  <p className="text-xs text-gray-500">
                    Type: {bottleneck.type}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiAgentCoordinationPanel;
