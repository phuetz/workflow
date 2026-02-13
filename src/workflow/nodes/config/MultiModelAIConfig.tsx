/**
 * Multi-Model AI Node Configuration
 * Use multiple AI providers with automatic fallback
 * AGENT 9: Node Library Expansion
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface MultiModelAIConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const MultiModelAIConfig: React.FC<MultiModelAIConfigProps> = ({ config, onChange }) => {
  const [openaiKey, setOpenaiKey] = useState((config.openaiKey as string) || '');
  const [anthropicKey, setAnthropicKey] = useState((config.anthropicKey as string) || '');
  const [googleKey, setGoogleKey] = useState((config.googleKey as string) || '');
  const [primaryProvider, setPrimaryProvider] = useState((config.primaryProvider as string) || 'openai');
  const [enableFallback, setEnableFallback] = useState((config.enableFallback as string) || 'true');
  const [prompt, setPrompt] = useState((config.prompt as string) || '');

  return (
    <div className="multimodelai-config space-y-4">
      <div className="font-semibold text-lg mb-4">Multi-Model AI</div>

      <div className="p-3 bg-blue-50 rounded text-sm mb-4">
        <strong>🔐 Authentication</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">OpenAI API Key</label>
        <input
          type="password"
          value={openaiKey}
          onChange={(e) => {
            setOpenaiKey(e.target.value);
            onChange({ ...config, openaiKey: e.target.value });
          }}
          placeholder=""
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
        />
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Anthropic API Key</label>
        <input
          type="password"
          value={anthropicKey}
          onChange={(e) => {
            setAnthropicKey(e.target.value);
            onChange({ ...config, anthropicKey: e.target.value });
          }}
          placeholder=""
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
        />
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Google AI API Key</label>
        <input
          type="password"
          value={googleKey}
          onChange={(e) => {
            setGoogleKey(e.target.value);
            onChange({ ...config, googleKey: e.target.value });
          }}
          placeholder=""
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
        />
        
      </div>


      <div className="p-3 bg-green-50 rounded text-sm mb-4 mt-6">
        <strong>⚙️ Configuration</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Primary Provider</label>
        <select
          value={primaryProvider}
          onChange={(e) => {
            setPrimaryProvider(e.target.value);
            onChange({ ...config, primaryProvider: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="google">Google Gemini</option>
        </select>
        
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Enable Fallback</label>
        <select
          value={enableFallback}
          onChange={(e) => {
            setEnableFallback(e.target.value);
            onChange({ ...config, enableFallback: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
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
          placeholder=""
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <strong>📝 Note:</strong> Use multiple AI providers with automatic fallback. Configure your credentials above.
      </div>
    </div>
  );
};
