/**
 * Agentic Workflow Builder
 *
 * Visual interface for building multi-agent workflow patterns
 */

import React, { useState, useEffect } from 'react';
import { AgenticPattern, PatternConfig } from '../../agentic/AgenticWorkflowEngine';
import { Agent } from '../../types/agents';

interface AgenticWorkflowBuilderProps {
  agents: Agent[];
  onExecute?: (config: PatternConfig) => void;
}

export const AgenticWorkflowBuilder: React.FC<AgenticWorkflowBuilderProps> = ({
  agents,
  onExecute,
}) => {
  const [selectedPattern, setSelectedPattern] = useState<AgenticPattern>('sequential');
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([]);
  const [maxIterations, setMaxIterations] = useState(5);
  const [timeoutMs, setTimeoutMs] = useState(300000);
  const [failurePolicy, setFailurePolicy] = useState<'fail-fast' | 'continue' | 'retry'>('retry');
  const [optimizationLevel, setOptimizationLevel] = useState<'none' | 'basic' | 'aggressive'>('basic');

  const patterns: Array<{
    id: AgenticPattern;
    name: string;
    description: string;
    minAgents: number;
    icon: string;
  }> = [
    {
      id: 'sequential',
      name: 'Sequential Processing',
      description: 'Agents process tasks in order, each building on the previous output',
      minAgents: 2,
      icon: '→',
    },
    {
      id: 'parallel',
      name: 'Parallel Execution',
      description: 'All agents process simultaneously and results are aggregated',
      minAgents: 2,
      icon: '||',
    },
    {
      id: 'orchestrator-workers',
      name: 'Orchestrator-Workers',
      description: 'One coordinator manages multiple worker agents',
      minAgents: 2,
      icon: '⚡',
    },
    {
      id: 'routing',
      name: 'Routing/Decision Tree',
      description: 'Dynamically route to specialized agents based on classification',
      minAgents: 2,
      icon: '🔀',
    },
    {
      id: 'hierarchical',
      name: 'Hierarchical Agents',
      description: 'Multi-level hierarchy with managers and subordinates',
      minAgents: 3,
      icon: '🏛️',
    },
    {
      id: 'feedback-loop',
      name: 'Feedback Loop',
      description: 'Iterative refinement based on evaluator feedback',
      minAgents: 2,
      icon: '🔄',
    },
    {
      id: 'consensus',
      name: 'Consensus Building',
      description: 'Multiple agents vote to reach agreement',
      minAgents: 3,
      icon: '🤝',
    },
    {
      id: 'competitive',
      name: 'Competitive Selection',
      description: 'Agents compete and best result wins',
      minAgents: 2,
      icon: '🏆',
    },
    {
      id: 'collaborative-refinement',
      name: 'Collaborative Refinement',
      description: 'Agents collaboratively improve solution over rounds',
      minAgents: 2,
      icon: '✨',
    },
  ];

  const toggleAgent = (agent: Agent) => {
    if (selectedAgents.find(a => a.id === agent.id)) {
      setSelectedAgents(selectedAgents.filter(a => a.id !== agent.id));
    } else {
      setSelectedAgents([...selectedAgents, agent]);
    }
  };

  const canExecute = () => {
    const pattern = patterns.find(p => p.id === selectedPattern);
    return pattern && selectedAgents.length >= pattern.minAgents;
  };

  const handleExecute = () => {
    if (!canExecute()) return;

    const config: PatternConfig = {
      pattern: selectedPattern,
      agents: selectedAgents,
      maxIterations,
      timeoutMs,
      failurePolicy,
      optimizationLevel,
    };

    onExecute?.(config);
  };

  const getEfficiencyEstimate = () => {
    // Rough efficiency estimates based on pattern
    const estimates: Record<AgenticPattern, number> = {
      'sequential': 10,
      'parallel': 60,
      'orchestrator-workers': 55,
      'routing': 40,
      'hierarchical': 45,
      'feedback-loop': 30,
      'consensus': 35,
      'competitive': 50,
      'collaborative-refinement': 40,
    };

    return estimates[selectedPattern] || 30;
  };

  const getROIEstimate = () => {
    // ROI estimates
    const estimates: Record<AgenticPattern, number> = {
      'sequential': 2,
      'parallel': 8,
      'orchestrator-workers': 7,
      'routing': 5,
      'hierarchical': 6,
      'feedback-loop': 4,
      'consensus': 4.5,
      'competitive': 6.5,
      'collaborative-refinement': 5.5,
    };

    return estimates[selectedPattern] || 3;
  };

  return (
    <div className="agentic-workflow-builder bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Agentic Workflow Builder</h2>

      {/* Pattern Selection */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">1. Select Workflow Pattern</h3>
        <div className="grid grid-cols-3 gap-4">
          {patterns.map(pattern => (
            <button
              key={pattern.id}
              onClick={() => setSelectedPattern(pattern.id)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                selectedPattern === pattern.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl">{pattern.icon}</span>
                {selectedPattern === pattern.id && (
                  <span className="text-blue-500">✓</span>
                )}
              </div>
              <div className="font-semibold mb-1">{pattern.name}</div>
              <div className="text-sm text-gray-600">{pattern.description}</div>
              <div className="text-xs text-gray-500 mt-2">
                Min agents: {pattern.minAgents}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Agent Selection */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">
          2. Select Agents ({selectedAgents.length} selected)
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {agents.map(agent => (
            <button
              key={agent.id}
              onClick={() => toggleAgent(agent)}
              className={`p-3 border-2 rounded-lg text-left transition-all ${
                selectedAgents.find(a => a.id === agent.id)
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{agent.name}</div>
                  <div className="text-sm text-gray-600">{agent.description}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {agent.capabilities.slice(0, 3).join(', ')}
                  </div>
                </div>
                {selectedAgents.find(a => a.id === agent.id) && (
                  <span className="text-green-500 text-xl">✓</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Configuration */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">3. Configuration</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Max Iterations</label>
            <input
              type="number"
              value={maxIterations}
              onChange={(e) => setMaxIterations(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
              min="1"
              max="20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Timeout (ms)</label>
            <input
              type="number"
              value={timeoutMs}
              onChange={(e) => setTimeoutMs(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
              min="1000"
              step="1000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Failure Policy</label>
            <select
              value={failurePolicy}
              onChange={(e) => setFailurePolicy(e.target.value as typeof failurePolicy)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="fail-fast">Fail Fast</option>
              <option value="continue">Continue</option>
              <option value="retry">Retry</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Optimization Level</label>
            <select
              value={optimizationLevel}
              onChange={(e) => setOptimizationLevel(e.target.value as typeof optimizationLevel)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="none">None</option>
              <option value="basic">Basic</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Efficiency Estimates */}
      <div className="mb-8 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Expected Performance</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Efficiency Gain</div>
            <div className="text-3xl font-bold text-blue-600">
              {getEfficiencyEstimate()}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Expected ROI</div>
            <div className="text-3xl font-bold text-green-600">
              {getROIEstimate()}:1
            </div>
          </div>
        </div>
      </div>

      {/* Execute Button */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {!canExecute() && (
            <span className="text-red-500">
              ⚠️ Select at least {patterns.find(p => p.id === selectedPattern)?.minAgents} agents
            </span>
          )}
        </div>
        <button
          onClick={handleExecute}
          disabled={!canExecute()}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            canExecute()
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Execute Agentic Workflow
        </button>
      </div>

      {/* Pattern Info */}
      {selectedPattern && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-2">Pattern Details</h4>
          <div className="text-sm text-gray-700">
            {patterns.find(p => p.id === selectedPattern)?.description}
          </div>
        </div>
      )}
    </div>
  );
};
