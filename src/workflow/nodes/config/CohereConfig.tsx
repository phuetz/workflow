/**
 * Cohere Node Configuration
 * AGENT 17: Node Library Expansion
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface CohereConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

type CohereOperation = 'generate' | 'embed' | 'classify' | 'summarize' | 'chat';

export const CohereConfig: React.FC<CohereConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<CohereOperation>(
    (config.operation as CohereOperation) || 'generate'
  );
  const [prompt, setPrompt] = useState((config.prompt as string) || '');
  const [model, setModel] = useState((config.model as string) || 'command');
  const [maxTokens, setMaxTokens] = useState((config.maxTokens as number) || 300);
  const [temperature, setTemperature] = useState((config.temperature as number) || 0.7);

  const handleChange = (updates: Partial<NodeConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="cohere-config space-y-4">
      <div className="font-semibold text-lg mb-4">Cohere Configuration</div>

      <div>
        <label className="block text-sm font-medium mb-2">Operation</label>
        <select
          value={operation}
          onChange={(e) => {
            setOperation(e.target.value as CohereOperation);
            handleChange({ operation: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="generate">Text Generation</option>
          <option value="embed">Embeddings</option>
          <option value="classify">Classification</option>
          <option value="summarize">Summarization</option>
          <option value="chat">Chat</option>
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="command">Command</option>
          <option value="command-light">Command Light</option>
          <option value="command-nightly">Command Nightly</option>
          <option value="embed-english-v3.0">Embed English v3</option>
          <option value="embed-multilingual-v3.0">Embed Multilingual v3</option>
        </select>
      </div>

      {(operation === 'generate' || operation === 'chat' || operation === 'summarize') && (
        <>
          <div>
            <label className="block text-sm font-medium mb-2">
              {operation === 'summarize' ? 'Text to Summarize' : 'Prompt'}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                handleChange({ prompt: e.target.value });
              }}
              placeholder="Enter your text or prompt..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2">Max Tokens</label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => {
                  setMaxTokens(parseInt(e.target.value));
                  handleChange({ maxTokens: parseInt(e.target.value) });
                }}
                min="1"
                max="4000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Temperature</label>
              <input
                type="number"
                value={temperature}
                onChange={(e) => {
                  setTemperature(parseFloat(e.target.value));
                  handleChange({ temperature: parseFloat(e.target.value) });
                }}
                min="0"
                max="2"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </>
      )}

      {operation === 'embed' && (
        <div>
          <label className="block text-sm font-medium mb-2">Texts to Embed</label>
          <textarea
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              handleChange({ prompt: e.target.value });
            }}
            placeholder="Enter text or array of texts..."
            className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
        <strong>API Key:</strong> Required in credentials. Get it from{' '}
        <a
          href="https://dashboard.cohere.com/api-keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          dashboard.cohere.com
        </a>
      </div>
    </div>
  );
};

export default CohereConfig;
