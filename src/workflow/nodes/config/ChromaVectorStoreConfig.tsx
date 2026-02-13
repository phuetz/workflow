/**
 * Chroma Vector Store Node Configuration
 * Chroma open-source embedding database
 * Vector Store / LangChain Integration
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface ChromaVectorStoreConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const ChromaVectorStoreConfig: React.FC<ChromaVectorStoreConfigProps> = ({ config, onChange }) => {
  const [url, setUrl] = useState((config.url as string) || 'http://localhost:8000');
  const [collectionName, setCollectionName] = useState((config.collectionName as string) || 'default');
  const [operation, setOperation] = useState((config.operation as string) || 'add');
  const [embeddingModel, setEmbeddingModel] = useState((config.embeddingModel as string) || 'openai');
  const [distance, setDistance] = useState((config.distance as string) || 'cosine');
  const [nResults, setNResults] = useState((config.nResults as number) || 10);
  const [includeMetadata, setIncludeMetadata] = useState((config.includeMetadata as boolean) ?? true);
  const [includeDocuments, setIncludeDocuments] = useState((config.includeDocuments as boolean) ?? true);

  return (
    <div className="chroma-config space-y-4">
      <div className="font-semibold text-lg mb-4">Chroma Vector Store</div>

      <div className="p-3 bg-blue-50 rounded text-sm mb-4">
        <strong>🔗 Connection</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Chroma URL</label>
        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            onChange({ ...config, url: e.target.value });
          }}
          placeholder="http://localhost:8000"
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
        />
        <p className="text-xs text-gray-500 mt-1">Chroma server URL</p>
      </div>

      <div className="p-3 bg-green-50 rounded text-sm mb-4 mt-6">
        <strong>⚙️ Configuration</strong>
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
          placeholder="my-collection"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">Name of the collection to use</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Embedding Model</label>
        <select
          value={embeddingModel}
          onChange={(e) => {
            setEmbeddingModel(e.target.value);
            onChange({ ...config, embeddingModel: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="openai">OpenAI (text-embedding-ada-002)</option>
          <option value="sentence-transformers">Sentence Transformers</option>
          <option value="cohere">Cohere</option>
          <option value="huggingface">HuggingFace</option>
          <option value="default">Chroma Default</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Distance Metric</label>
        <select
          value={distance}
          onChange={(e) => {
            setDistance(e.target.value);
            onChange({ ...config, distance: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="cosine">Cosine Similarity</option>
          <option value="l2">L2 (Euclidean)</option>
          <option value="ip">Inner Product</option>
        </select>
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
          <option value="add">Add Documents</option>
          <option value="query">Query Collection</option>
          <option value="get">Get by IDs</option>
          <option value="update">Update Documents</option>
          <option value="delete">Delete Documents</option>
          <option value="peek">Peek Collection</option>
          <option value="count">Count Documents</option>
        </select>
      </div>

      {operation === 'query' && (
        <>
          <div>
            <label className="block text-sm font-medium mb-2">Number of Results</label>
            <input
              type="number"
              min="1"
              max="100"
              value={nResults}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setNResults(value);
                onChange({ ...config, nResults: value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="flex items-center space-x-4">
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

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={includeDocuments}
                onChange={(e) => {
                  setIncludeDocuments(e.target.checked);
                  onChange({ ...config, includeDocuments: e.target.checked });
                }}
                className="rounded"
              />
              <span className="text-sm">Include Documents</span>
            </label>
          </div>
        </>
      )}

      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <strong>📝 Note:</strong> Chroma is an open-source embedding database optimized for AI applications.
        Self-hostable and easy to use.
      </div>
    </div>
  );
};
