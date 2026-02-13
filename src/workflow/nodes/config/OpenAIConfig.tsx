/**
 * OpenAI / ChatGPT Node Configuration
 * OpenAI GPT models for text generation and chat
 * AGENT 9: Node Library Expansion
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface OpenAIConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const OpenAIConfig: React.FC<OpenAIConfigProps> = ({ config, onChange }) => {
  const [apiKey, setApiKey] = useState((config.apiKey as string) || '');
  const [operation, setOperation] = useState((config.operation as string) || 'chat');
  const [model, setModel] = useState((config.model as string) || 'gpt-4');
  const [prompt, setPrompt] = useState((config.prompt as string) || '');

  return (
    <div className="openai-config space-y-4">
      <div className="font-semibold text-lg mb-4">OpenAI / ChatGPT</div>

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
          placeholder="sk-..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
        />
        <p className="text-xs text-gray-500 mt-1">Get from platform.openai.com</p>
      </div>


      <div className="p-3 bg-green-50 rounded text-sm mb-4 mt-6">
        <strong>⚙️ Configuration</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Operation</label>
        <select
          value={operation}
          onChange={(e) => {
            setOperation(e.target.value);
            onChange({ ...config, operation: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="chat">Chat Completion</option>
          <option value="completion">Text Completion</option>
          <option value="embedding">Create Embeddings</option>
          <option value="image">Generate Image (DALL-E)</option>
        </select>
        
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
          <option value="gpt-4">GPT-4</option>
          <option value="gpt-4-turbo">GPT-4 Turbo</option>
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
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

      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <strong>📝 Note:</strong> OpenAI GPT models for text generation and chat. Configure your credentials above.
      </div>
    </div>
  );
};
