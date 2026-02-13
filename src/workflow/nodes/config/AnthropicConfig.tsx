/**
 * Claude AI (Anthropic) Node Configuration
 * Anthropic Claude AI for intelligent conversations
 * AGENT 9: Node Library Expansion
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface AnthropicConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const AnthropicConfig: React.FC<AnthropicConfigProps> = ({ config, onChange }) => {
  const [apiKey, setApiKey] = useState((config.apiKey as string) || '');
  const [model, setModel] = useState((config.model as string) || 'claude-3-opus-20240229');
  const [prompt, setPrompt] = useState((config.prompt as string) || '');
  const [maxTokens, setMaxTokens] = useState((config.maxTokens as number) || 1024);

  return (
    <div className="anthropic-config space-y-4">
      <div className="font-semibold text-lg mb-4">Claude AI (Anthropic)</div>

      <div className="p-3 bg-blue-50 rounded text-sm mb-4">
        <strong>🔐 Authentication</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            onChange({ ...config, apiKey: e.target.value });
          }}
          placeholder="sk-ant-..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
        />
        
      </div>


      <div className="p-3 bg-green-50 rounded text-sm mb-4 mt-6">
        <strong>⚙️ Configuration</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Model</label>
        <select
          value={model}
          onChange={(e) => {
            setModel(e.target.value);
            onChange({ ...config, model: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="claude-3-opus-20240229">Claude 3 Opus</option>
          <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
          <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
        </select>
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Prompt</label>
        <textarea
          rows={4}
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            onChange({ ...config, prompt: e.target.value });
          }}
          placeholder="Your prompt..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Max Tokens</label>
        <input
          type="number"
          value={maxTokens}
          onChange={(e) => {
            const numValue = parseInt(e.target.value, 10) || 1024;
            setMaxTokens(numValue);
            onChange({ ...config, maxTokens: numValue });
          }}
          placeholder=""
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />

      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <strong>📝 Note:</strong> Anthropic Claude AI for intelligent conversations. Configure your credentials above.
      </div>
    </div>
  );
};
