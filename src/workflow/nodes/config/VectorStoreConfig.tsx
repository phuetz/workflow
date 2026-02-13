/**
 * Generic Vector Store Node Configuration
 * Unified interface for multiple vector store providers
 * Vector Store / LangChain Integration
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface VectorStoreConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const VectorStoreConfig: React.FC<VectorStoreConfigProps> = ({ config, onChange }) => {
  const [provider, setProvider] = useState((config.provider as string) || 'pinecone');
  const [operation, setOperation] = useState((config.operation as string) || 'upsert');
  const [apiKey, setApiKey] = useState((config.apiKey as string) || '');
  const [url, setUrl] = useState((config.url as string) || '');
  const [indexName, setIndexName] = useState((config.indexName as string) || '');
  const [collectionName, setCollectionName] = useState((config.collectionName as string) || '');
  const [limit, setLimit] = useState((config.limit as number) || 10);
  const [includeMetadata, setIncludeMetadata] = useState((config.includeMetadata as boolean) ?? true);

  const renderProviderFields = () => {
    switch (provider) {
      case 'pinecone':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  onChange({ ...config, apiKey: e.target.value });
                }}
                placeholder="Pinecone API key"
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Index Name</label>
              <input
                type="text"
                value={indexName}
                onChange={(e) => {
                  setIndexName(e.target.value);
                  onChange({ ...config, indexName: e.target.value });
                }}
                placeholder="my-index"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </>
        );

      case 'chroma':
      case 'weaviate':
      case 'qdrant':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">Server URL</label>
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  onChange({ ...config, url: e.target.value });
                }}
                placeholder={`${provider} server URL`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {provider === 'weaviate' ? 'Class Name' : 'Collection Name'}
              </label>
              <input
                type="text"
                value={collectionName}
                onChange={(e) => {
                  setCollectionName(e.target.value);
                  onChange({ ...config, collectionName: e.target.value });
                }}
                placeholder={provider === 'weaviate' ? 'Document' : 'my-collection'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </>
        );

      case 'milvus':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">Milvus URL</label>
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  onChange({ ...config, url: e.target.value });
                }}
                placeholder="http://localhost:19530"
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Collection Name</label>
              <input
                type="text"
                value={collectionName}
                onChange={(e) => {
                  setCollectionName(e.target.value);
                  onChange({ ...config, collectionName: e.target.value });
                }}
                placeholder="documents"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </>
        );

      case 'faiss':
        return (
          <div>
            <label className="block text-sm font-medium mb-2">Index Path</label>
            <input
              type="text"
              value={indexName}
              onChange={(e) => {
                setIndexName(e.target.value);
                onChange({ ...config, indexName: e.target.value });
              }}
              placeholder="/path/to/index.faiss"
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">Local path to FAISS index file</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="vector-store-config space-y-4">
      <div className="font-semibold text-lg mb-4">Vector Store</div>

      <div className="p-3 bg-purple-50 rounded text-sm mb-4">
        <strong>🗄️ Provider Selection</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Vector Store Provider</label>
        <select
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value);
            onChange({ ...config, provider: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="pinecone">Pinecone (Serverless)</option>
          <option value="chroma">Chroma (Open Source)</option>
          <option value="weaviate">Weaviate (Cloud Native)</option>
          <option value="qdrant">Qdrant (High Performance)</option>
          <option value="milvus">Milvus (Enterprise)</option>
          <option value="faiss">FAISS (Local)</option>
          <option value="pgvector">PostgreSQL + pgvector</option>
          <option value="redis">Redis Vector</option>
        </select>
      </div>

      <div className="p-3 bg-blue-50 rounded text-sm mb-4 mt-6">
        <strong>🔗 Connection</strong>
      </div>

      {renderProviderFields()}

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
          <option value="upsert">Upsert Vectors</option>
          <option value="query">Query/Search</option>
          <option value="similaritySearch">Similarity Search</option>
          <option value="get">Get by ID</option>
          <option value="delete">Delete Vectors</option>
          <option value="update">Update Metadata</option>
        </select>
      </div>

      {(operation === 'query' || operation === 'similaritySearch') && (
        <>
          <div>
            <label className="block text-sm font-medium mb-2">Result Limit</label>
            <input
              type="number"
              min="1"
              max="100"
              value={limit}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setLimit(value);
                onChange({ ...config, limit: value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">Number of results to return</p>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => {
                  setIncludeMetadata(e.target.checked);
                  onChange({ ...config, includeMetadata: e.target.checked });
                }}
                className="rounded"
              />
              <span className="text-sm">Include Metadata</span>
            </label>
          </div>
        </>
      )}

      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <strong>📝 Note:</strong> Vector stores are optimized for similarity search and semantic retrieval.
        Choose the provider that best fits your performance and deployment requirements.
      </div>

      <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
        <strong>Provider Comparison:</strong>
        <ul className="mt-2 space-y-1 ml-4">
          <li><strong>Pinecone:</strong> Serverless, managed, easy to use</li>
          <li><strong>Chroma:</strong> Open source, self-hosted, simple</li>
          <li><strong>Weaviate:</strong> Cloud native, GraphQL API, hybrid search</li>
          <li><strong>Qdrant:</strong> High performance, filtering, production-grade</li>
          <li><strong>Milvus:</strong> Enterprise-scale, distributed, GPU support</li>
          <li><strong>FAISS:</strong> Local, fast, research-oriented</li>
        </ul>
      </div>
    </div>
  );
};
