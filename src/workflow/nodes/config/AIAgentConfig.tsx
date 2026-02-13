/**
 * AI Agent Node Configuration
 * Configure autonomous AI agents with tools and memory
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface AIAgentConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

interface AgentTool {
  id: string;
  name: string;
  enabled: boolean;
}

export const AIAgentConfig: React.FC<AIAgentConfigProps> = ({ config, onChange }) => {
  const [provider, setProvider] = useState((config.provider as string) || 'openai');
  const [model, setModel] = useState((config.model as string) || 'gpt-4');
  const [agentType, setAgentType] = useState((config.agentType as string) || 'react');
  const [systemPrompt, setSystemPrompt] = useState((config.systemPrompt as string) || '');
  const [maxIterations, setMaxIterations] = useState((config.maxIterations as number) || 10);
  const [temperature, setTemperature] = useState((config.temperature as number) || 0.7);
  const [memoryEnabled, setMemoryEnabled] = useState((config.memoryEnabled as boolean) ?? true);
  const [memoryType, setMemoryType] = useState((config.memoryType as string) || 'conversation');

  const availableTools: AgentTool[] = [
    { id: 'web-search', name: 'Web Search', enabled: true },
    { id: 'calculator', name: 'Calculator', enabled: true },
    { id: 'code-executor', name: 'Code Executor', enabled: false },
    { id: 'database-query', name: 'Database Query', enabled: false },
    { id: 'api-caller', name: 'API Caller', enabled: true },
    { id: 'file-reader', name: 'File Reader', enabled: false },
    { id: 'web-scraper', name: 'Web Scraper', enabled: false },
  ];

  const [tools, setTools] = useState<AgentTool[]>(
    (config.tools as AgentTool[]) || availableTools
  );

  const handleChange = (updates: Partial<NodeConfig>) => {
    onChange({ ...config, ...updates });
  };

  const toggleTool = (toolId: string) => {
    const newTools = tools.map((tool) =>
      tool.id === toolId ? { ...tool, enabled: !tool.enabled } : tool
    );
    setTools(newTools);
    handleChange({ tools: newTools });
  };

  const modelsByProvider: Record<string, string[]> = {
    openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229'],
    google: ['gemini-pro'],
  };

  return (
    <div className="ai-agent-config space-y-4 text-gray-900 dark:text-gray-100">
      <div className="font-semibold text-lg mb-4">AI Agent Configuration</div>

      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded text-sm mb-4">
        <strong>🤖 Autonomous Agent Setup</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Agent Type</label>
        <select
          value={agentType}
          onChange={(e) => {
            setAgentType(e.target.value);
            handleChange({ agentType: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md"
        >
          <option value="react">ReAct (Reasoning + Acting)</option>
          <option value="plan-execute">Plan-and-Execute</option>
          <option value="conversational">Conversational</option>
          <option value="openai-functions">OpenAI Functions</option>
          <option value="structured-chat">Structured Chat</option>
        </select>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Agent reasoning strategy
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Provider</label>
        <select
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value);
            const newModel = modelsByProvider[e.target.value][0];
            setModel(newModel);
            handleChange({ provider: e.target.value, model: newModel });
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md"
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="google">Google AI</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Model</label>
        <select
          value={model}
          onChange={(e) => {
            setModel(e.target.value);
            handleChange({ model: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md"
        >
          {modelsByProvider[provider].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded text-sm mb-4 mt-6">
        <strong>🛠️ Agent Tools</strong>
      </div>

      <div className="space-y-2">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <input
              type="checkbox"
              checked={tool.enabled}
              onChange={() => toggleTool(tool.id)}
              className="w-4 h-4"
            />
            <label className="text-sm font-medium flex-1 cursor-pointer">
              {tool.name}
            </label>
          </div>
        ))}
      </div>

      <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded text-sm mb-4 mt-6">
        <strong>🧠 Memory & Behavior</strong>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="memoryEnabled"
          checked={memoryEnabled}
          onChange={(e) => {
            setMemoryEnabled(e.target.checked);
            handleChange({ memoryEnabled: e.target.checked });
          }}
          className="w-4 h-4"
        />
        <label htmlFor="memoryEnabled" className="text-sm font-medium">
          Enable memory
        </label>
      </div>

      {memoryEnabled && (
        <div>
          <label className="block text-sm font-medium mb-2">Memory Type</label>
          <select
            value={memoryType}
            onChange={(e) => {
              setMemoryType(e.target.value);
              handleChange({ memoryType: e.target.value });
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md"
          >
            <option value="conversation">Conversation Buffer</option>
            <option value="summary">Conversation Summary</option>
            <option value="vector">Vector Store</option>
            <option value="entity">Entity Memory</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">System Prompt</label>
        <textarea
          rows={4}
          value={systemPrompt}
          onChange={(e) => {
            setSystemPrompt(e.target.value);
            handleChange({ systemPrompt: e.target.value });
          }}
          placeholder="You are a helpful AI agent that can use tools to accomplish tasks..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Max Iterations</label>
        <input
          type="number"
          value={maxIterations}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10) || 10;
            setMaxIterations(val);
            handleChange({ maxIterations: val });
          }}
          min="1"
          max="50"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Maximum reasoning loops before stopping
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Temperature: {temperature}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={temperature}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            setTemperature(val);
            handleChange({ temperature: val });
          }}
          className="w-full"
        />
      </div>

      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded text-sm">
        <strong>📝 Note:</strong> AI agents can autonomously use tools to accomplish complex
        tasks. Configure tools and memory settings above.
      </div>
    </div>
  );
};

export default AIAgentConfig;
