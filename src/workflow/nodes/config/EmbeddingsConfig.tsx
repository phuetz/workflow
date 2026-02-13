/**
 * Embeddings Node Configuration
 * Generate vector embeddings from text using various providers
 * LangChain Integration
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface EmbeddingsConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const EmbeddingsConfig: React.FC<EmbeddingsConfigProps> = ({ config, onChange }) => {
  const [provider, setProvider] = useState((config.provider as string) || 'openai');
  const [apiKey, setApiKey] = useState((config.apiKey as string) || '');
  const [model, setModel] = useState((config.model as string) || 'text-embedding-ada-002');
  const [batchSize, setBatchSize] = useState((config.batchSize as number) || 100);
  const [stripNewLines, setStripNewLines] = useState((config.stripNewLines as boolean) ?? true);
  const [timeout, setTimeout] = useState((config.timeout as number) || 30000);

  const getModelOptions = () => {
    switch (provider) {
      case 'openai':
        return [
          { value: 'text-embedding-ada-002', label: 'text-embedding-ada-002 (1536 dims)' },
          { value: 'text-embedding-3-small', label: 'text-embedding-3-small (1536 dims)' },
          { value: 'text-embedding-3-large', label: 'text-embedding-3-large (3072 dims)' },
        ];
      case 'cohere':
        return [
          { value: 'embed-english-v3.0', label: 'embed-english-v3.0 (1024 dims)' },
          { value: 'embed-multilingual-v3.0', label: 'embed-multilingual-v3.0 (1024 dims)' },
          { value: 'embed-english-light-v3.0', label: 'embed-english-light-v3.0 (384 dims)' },
        ];
      case 'huggingface':
        return [
          { value: 'sentence-transformers/all-MiniLM-L6-v2', label: 'all-MiniLM-L6-v2 (384 dims)' },
          { value: 'sentence-transformers/all-mpnet-base-v2', label: 'all-mpnet-base-v2 (768 dims)' },
          { value: 'BAAI/bge-small-en-v1.5', label: 'bge-small-en-v1.5 (384 dims)' },
          { value: 'BAAI/bge-large-en-v1.5', label: 'bge-large-en-v1.5 (1024 dims)' },
        ];
      case 'google':
        return [
          { value: 'textembedding-gecko@001', label: 'textembedding-gecko@001 (768 dims)' },
          { value: 'textembedding-gecko@003', label: 'textembedding-gecko@003 (768 dims)' },
          { value: 'text-embedding-004', label: 'text-embedding-004 (768 dims)' },
        ];
      case 'azure':
        return [
          { value: 'text-embedding-ada-002', label: 'text-embedding-ada-002 (1536 dims)' },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="embeddings-config space-y-4">
      <div className="font-semibold text-lg mb-4">Embeddings Generator</div>

      <div className="p-3 bg-purple-50 rounded text-sm mb-4">
        <strong>🤖 Provider Selection</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Embedding Provider</label>
        <select
          value={provider}
          onChange={(e) => {
            const newProvider = e.target.value;
            setProvider(newProvider);
            // Reset model when provider changes
            const defaultModels: Record<string, string> = {
              openai: 'text-embedding-ada-002',
              cohere: 'embed-english-v3.0',
              huggingface: 'sentence-transformers/all-MiniLM-L6-v2',
              google: 'textembedding-gecko@001',
              azure: 'text-embedding-ada-002',
            };
            setModel(defaultModels[newProvider] || '');
            onChange({ ...config, provider: newProvider, model: defaultModels[newProvider] });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="openai">OpenAI</option>
          <option value="cohere">Cohere</option>
          <option value="huggingface">HuggingFace</option>
          <option value="google">Google Vertex AI</option>
          <option value="azure">Azure OpenAI</option>
        </select>
      </div>

      <div className="p-3 bg-blue-50 rounded text-sm mb-4 mt-6">
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
          placeholder={`${provider} API key`}
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
        />
        <p className="text-xs text-gray-500 mt-1">
          {provider === 'openai' && 'Get from platform.openai.com'}
          {provider === 'cohere' && 'Get from dashboard.cohere.com'}
          {provider === 'huggingface' && 'Get from huggingface.co/settings/tokens'}
          {provider === 'google' && 'Get from Google Cloud Console'}
          {provider === 'azure' && 'Get from Azure Portal'}
        </p>
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
          {getModelOptions().map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Batch Size</label>
        <input
          type="number"
          min="1"
          max="1000"
          value={batchSize}
          onChange={(e) => {
            const value = parseInt(e.target.value);
            setBatchSize(value);
            onChange({ ...config, batchSize: value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">Number of texts to embed in one batch</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Timeout (ms)</label>
        <input
          type="number"
          min="1000"
          max="300000"
          step="1000"
          value={timeout}
          onChange={(e) => {
            const value = parseInt(e.target.value);
            setTimeout(value);
            onChange({ ...config, timeout: value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">Request timeout in milliseconds</p>
      </div>

      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={stripNewLines}
            onChange={(e) => {
              setStripNewLines(e.target.checked);
              onChange({ ...config, stripNewLines: e.target.checked });
            }}
            className="rounded"
          />
          <span className="text-sm">Strip New Lines</span>
        </label>
        <p className="text-xs text-gray-500 mt-1">Remove newline characters before embedding</p>
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <strong>📝 Note:</strong> Embeddings convert text into numerical vectors for semantic search and similarity matching.
        Different models produce vectors of different dimensions.
      </div>

      <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
        <strong>Performance Tips:</strong>
        <ul className="mt-2 space-y-1 ml-4">
          <li>• OpenAI Ada-002: Best quality, moderate cost</li>
          <li>• Cohere v3: Multilingual support, competitive pricing</li>
          <li>• HuggingFace: Free, self-hosted, good for experimentation</li>
          <li>• Use batch processing for better throughput</li>
          <li>• Match embedding dimensions with your vector store</li>
        </ul>
      </div>
    </div>
  );
};
