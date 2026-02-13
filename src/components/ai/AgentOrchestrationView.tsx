/**
 * Agent Orchestration View
 *
 * Real-time visualization of multi-agent coordination and communication
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Agent, AgentMessage, AgentTask, AgentStatus } from '../../types/agents';
import { PatternExecutionResult, AgenticPattern } from '../../agentic/AgenticWorkflowEngine';

interface AgentOrchestrationViewProps {
  agents: Agent[];
  activePattern?: AgenticPattern;
  executionResult?: PatternExecutionResult;
  onAgentSelect?: (agent: Agent) => void;
}

interface MessageFlow {
  id: string;
  from: string;
  to: string;
  type: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'failed';
}

export const AgentOrchestrationView: React.FC<AgentOrchestrationViewProps> = ({
  agents,
  activePattern,
  executionResult,
  onAgentSelect,
}) => {
  const [messageFlow, setMessageFlow] = useState<MessageFlow[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'flow' | 'timeline'>('grid');

  const getAgentStatusColor = (status: AgentStatus): string => {
    const colors: Record<AgentStatus, string> = {
      idle: 'bg-gray-400',
      running: 'bg-blue-500',
      paused: 'bg-yellow-500',
      stopped: 'bg-red-500',
      error: 'bg-red-600',
      initializing: 'bg-purple-500',
    };
    return colors[status] || 'bg-gray-400';
  };

  const getPatternIcon = (pattern?: AgenticPattern): string => {
    const icons: Record<AgenticPattern, string> = {
      sequential: '→',
      parallel: '||',
      'orchestrator-workers': '⚡',
      routing: '🔀',
      hierarchical: '🏛️',
      'feedback-loop': '🔄',
      consensus: '🤝',
      competitive: '🏆',
      'collaborative-refinement': '✨',
    };
    return pattern ? icons[pattern] || '?' : '?';
  };

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);
    onAgentSelect?.(agent);
  };

  // Simulate message flow for visualization
  useEffect(() => {
    if (executionResult) {
      const messages: MessageFlow[] = [];
      executionResult.agentsUsed.forEach((agentId, i) => {
        messages.push({
          id: `msg_${i}`,
          from: i === 0 ? 'System' : executionResult.agentsUsed[i - 1],
          to: agentId,
          type: 'request',
          timestamp: new Date(Date.now() - (executionResult.agentsUsed.length - i) * 1000).toISOString(),
          status: 'delivered',
        });
      });
      setMessageFlow(messages);
    }
  }, [executionResult]);

  return (
    <div className="agent-orchestration-view bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Agent Orchestration</h2>
          {activePattern && (
            <div className="text-sm text-gray-600 mt-1">
              Pattern: <span className="font-semibold">{getPatternIcon(activePattern)} {activePattern}</span>
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          {(['grid', 'flow', 'timeline'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-2 rounded ${
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-4 gap-4">
          {agents.map(agent => (
            <button
              key={agent.id}
              onClick={() => handleAgentClick(agent)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                selectedAgent?.id === agent.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              {/* Status Indicator */}
              <div className="flex items-start justify-between mb-2">
                <div className={`w-3 h-3 rounded-full ${getAgentStatusColor(agent.status)}`} />
                {executionResult?.agentsUsed.includes(agent.id) && (
                  <span className="text-green-500 text-xs">Active</span>
                )}
              </div>

              {/* Agent Info */}
              <div className="font-semibold mb-1">{agent.name}</div>
              <div className="text-xs text-gray-600 mb-2">{agent.type}</div>

              {/* Capabilities */}
              <div className="flex flex-wrap gap-1">
                {agent.capabilities.slice(0, 3).map(cap => (
                  <span
                    key={cap}
                    className="text-xs px-2 py-1 bg-gray-100 rounded"
                  >
                    {cap}
                  </span>
                ))}
              </div>

              {/* Status */}
              <div className="mt-2 text-xs text-gray-500">
                Status: {agent.status}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Flow View */}
      {viewMode === 'flow' && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            Message flow ({messageFlow.length} messages)
          </div>

          {messageFlow.map((msg, i) => (
            <div key={msg.id} className="flex items-center gap-4">
              {/* From */}
              <div className="flex-1 text-right">
                <div className="inline-block px-3 py-2 bg-blue-100 rounded">
                  {agents.find(a => a.id === msg.from)?.name || msg.from}
                </div>
              </div>

              {/* Arrow */}
              <div className="text-gray-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>

              {/* To */}
              <div className="flex-1">
                <div className="inline-block px-3 py-2 bg-green-100 rounded">
                  {agents.find(a => a.id === msg.to)?.name || msg.to}
                </div>
              </div>

              {/* Message Info */}
              <div className="flex-1 text-sm text-gray-600">
                <div>{msg.type}</div>
                <div className="text-xs">{new Date(msg.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>
          ))}

          {messageFlow.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No messages yet. Execute a workflow to see message flow.
            </div>
          )}
        </div>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-300" />

          {/* Timeline Events */}
          <div className="space-y-8">
            {messageFlow.map((msg, i) => (
              <div key={msg.id} className={`relative flex ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
                {/* Event Dot */}
                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className={`w-4 h-4 rounded-full border-4 border-white ${
                    msg.status === 'delivered' ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                </div>

                {/* Event Content */}
                <div className="flex-1 px-8">
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                    <div className="font-semibold mb-1">
                      {agents.find(a => a.id === msg.from)?.name || msg.from} → {agents.find(a => a.id === msg.to)?.name || msg.to}
                    </div>
                    <div className="text-sm text-gray-600">{msg.type}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(msg.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex-1" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Execution Metrics */}
      {executionResult && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
          <h3 className="font-semibold mb-3">Execution Metrics</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Execution Time</div>
              <div className="text-2xl font-bold text-blue-600">
                {executionResult.executionTime}ms
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Agents Used</div>
              <div className="text-2xl font-bold text-purple-600">
                {executionResult.agentsUsed.length}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Efficiency Gain</div>
              <div className="text-2xl font-bold text-green-600">
                {executionResult.efficiencyGain.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Messages Sent</div>
              <div className="text-2xl font-bold text-orange-600">
                {executionResult.metadata.messagesSent}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agent Details Panel */}
      {selectedAgent && (
        <div className="mt-6 p-4 border-2 border-blue-500 rounded-lg bg-blue-50">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-semibold">{selectedAgent.name}</h3>
            <button
              onClick={() => setSelectedAgent(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Type</div>
              <div className="font-medium">{selectedAgent.type}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Status</div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getAgentStatusColor(selectedAgent.status)}`} />
                <span className="font-medium">{selectedAgent.status}</span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-2">Capabilities</div>
            <div className="flex flex-wrap gap-2">
              {selectedAgent.capabilities.map(cap => (
                <span
                  key={cap}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm text-gray-600">Description</div>
            <div className="text-sm mt-1">{selectedAgent.description}</div>
          </div>
        </div>
      )}
    </div>
  );
};
