/**
 * Metric Configuration
 * Configure individual metrics with advanced options
 */

import React, { useState } from 'react';
import type { MetricConfig, MetricType } from '../../types/evaluation';

interface MetricConfigurationProps {
  metric: MetricConfig;
  onChange?: (metric: MetricConfig) => void;
}

export const MetricConfiguration: React.FC<MetricConfigurationProps> = ({ metric, onChange }) => {
  const [config, setConfig] = useState(metric);

  const handleUpdate = (updates: Partial<MetricConfig>) => {
    const updated = { ...config, ...updates };
    setConfig(updated);
    if (onChange) {
      onChange(updated);
    }
  };

  const handleConfigUpdate = (configUpdates: Record<string, unknown>) => {
    const updated = {
      ...config,
      config: { ...config.config, ...configUpdates },
    };
    setConfig(updated);
    if (onChange) {
      onChange(updated);
    }
  };

  return (
    <div className="metric-configuration border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">{config.name}</h3>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => handleUpdate({ enabled: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm text-gray-600">Enabled</span>
        </label>
      </div>

      <p className="text-sm text-gray-600">{config.description}</p>

      {/* Common Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Weight (0-1)</label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={config.weight}
            onChange={(e) => handleUpdate({ weight: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Threshold (0-1)</label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={config.threshold || 0.7}
            onChange={(e) => handleUpdate({ threshold: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Type-Specific Settings */}
      {config.type === 'correctness' && (
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium text-gray-800">Correctness Settings</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">LLM Provider</label>
            <select
              value={(config.config as { llmProvider?: string })?.llmProvider || 'openai'}
              onChange={(e) => handleConfigUpdate({ llmProvider: e.target.value })}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
              <option value="azure">Azure</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input
              type="text"
              value={(config.config as { model?: string })?.model || 'gpt-4'}
              onChange={(e) => handleConfigUpdate({ model: e.target.value })}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {config.type === 'latency' && (
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium text-gray-800">Latency Settings</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Latency (ms)</label>
            <input
              type="number"
              min="100"
              value={(config.config as { maxLatency?: number })?.maxLatency || 10000}
              onChange={(e) => handleConfigUpdate({ maxLatency: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={(config.config as { trackPerNode?: boolean })?.trackPerNode ?? true}
              onChange={(e) => handleConfigUpdate({ trackPerNode: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm text-gray-600">Track per-node latency</span>
          </label>
        </div>
      )}

      {config.type === 'cost' && (
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium text-gray-800">Cost Settings</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Cost (USD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={(config.config as { maxCost?: number })?.maxCost || 1.0}
              onChange={(e) => handleConfigUpdate({ maxCost: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={(config.config as { trackTokenUsage?: boolean })?.trackTokenUsage ?? true}
              onChange={(e) => handleConfigUpdate({ trackTokenUsage: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm text-gray-600">Track token usage</span>
          </label>
        </div>
      )}

      {config.type === 'toxicity' && (
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium text-gray-800">Toxicity Settings</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Detection Method</label>
            <select
              value={(config.config as { provider?: string })?.provider || 'local'}
              onChange={(e) => handleConfigUpdate({ provider: e.target.value })}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="local">Pattern-based (Local)</option>
              <option value="llm">LLM-based</option>
              <option value="perspective">Perspective API</option>
            </select>
          </div>
        </div>
      )}

      {config.type === 'bias' && (
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium text-gray-800">Bias Settings</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Detection Method</label>
            <select
              value={(config.config as { method?: string })?.method || 'llm'}
              onChange={(e) => handleConfigUpdate({ method: e.target.value })}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="llm">LLM-based</option>
              <option value="statistical">Statistical</option>
              <option value="embedding">Embedding-based</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
            {['gender', 'race', 'age', 'religion', 'disability'].map((category) => (
              <label key={category} className="flex items-center gap-2 mb-1">
                <input
                  type="checkbox"
                  checked={((config.config as { categories?: string[] })?.categories || []).includes(category)}
                  onChange={(e) => {
                    const categories = (config.config as { categories?: string[] })?.categories || [];
                    if (e.target.checked) {
                      handleConfigUpdate({ categories: [...categories, category] });
                    } else {
                      handleConfigUpdate({ categories: categories.filter((c) => c !== category) });
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm text-gray-600 capitalize">{category}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {config.type === 'toolCalling' && (
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium text-gray-800">Tool Calling Settings</h4>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={(config.config as { requireAllTools?: boolean })?.requireAllTools ?? false}
              onChange={(e) => handleConfigUpdate({ requireAllTools: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm text-gray-600">Require all expected tools</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={(config.config as { validateParameters?: boolean })?.validateParameters ?? true}
              onChange={(e) => handleConfigUpdate({ validateParameters: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm text-gray-600">Validate parameters</span>
          </label>
        </div>
      )}
    </div>
  );
};

export default MetricConfiguration;
