/**
 * Sanity Node Configuration
 * Platform for structured content
 */

import React, { useState } from 'react';

interface SanityConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

type SanityOperation =
  | 'create' | 'createOrReplace' | 'createIfNotExists'
  | 'patch' | 'delete' | 'query';

export const SanityConfig: React.FC<SanityConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<SanityOperation>(
    (config.operation as SanityOperation) || 'create'
  );
  const [projectId, setProjectId] = useState(config.projectId as string || '');
  const [dataset, setDataset] = useState(config.dataset as string || 'production');
  const [documentId, setDocumentId] = useState(config.documentId as string || '');
  const [documentType, setDocumentType] = useState(config.documentType as string || '');
  const [document, setDocument] = useState(config.document as string || '{}');
  const [groqQuery, setGroqQuery] = useState(config.groqQuery as string || '');
  const [patches, setPatches] = useState(config.patches as string || '[]');
  const [useCdn, setUseCdn] = useState<boolean>((config.useCdn as boolean) ?? true);

  const handleOperationChange = (newOperation: SanityOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleProjectIdChange = (value: string) => {
    setProjectId(value);
    onChange({ ...config, projectId: value });
  };

  const handleDatasetChange = (value: string) => {
    setDataset(value);
    onChange({ ...config, dataset: value });
  };

  const handleDocumentIdChange = (value: string) => {
    setDocumentId(value);
    onChange({ ...config, documentId: value });
  };

  const handleDocumentTypeChange = (value: string) => {
    setDocumentType(value);
    onChange({ ...config, documentType: value });
  };

  const handleDocumentChange = (value: string) => {
    setDocument(value);
    onChange({ ...config, document: value });
  };

  const handleGroqQueryChange = (value: string) => {
    setGroqQuery(value);
    onChange({ ...config, groqQuery: value });
  };

  const handlePatchesChange = (value: string) => {
    setPatches(value);
    onChange({ ...config, patches: value });
  };

  const handleUseCdnChange = (value: boolean) => {
    setUseCdn(value);
    onChange({ ...config, useCdn: value });
  };

  const needsDocument = ['create', 'createOrReplace', 'createIfNotExists'].includes(operation);
  const needsDocumentId = ['patch', 'delete', 'createIfNotExists', 'createOrReplace'].includes(operation);
  const needsPatches = operation === 'patch';
  const needsQuery = operation === 'query';

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as SanityOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
        >
          <option value="create">Create Document</option>
          <option value="createOrReplace">Create or Replace Document</option>
          <option value="createIfNotExists">Create If Not Exists</option>
          <option value="patch">Patch Document</option>
          <option value="delete">Delete Document</option>
          <option value="query">Query (GROQ)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Project ID
        </label>
        <input
          type="text"
          value={projectId}
          onChange={(e) => handleProjectIdChange(e.target.value)}
          placeholder="e.g., abc123de"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Your Sanity project ID (found in sanity.json or project settings)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dataset
        </label>
        <input
          type="text"
          value={dataset}
          onChange={(e) => handleDatasetChange(e.target.value)}
          placeholder="production, staging, development..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Dataset name (default: production)
        </p>
      </div>

      {needsDocumentId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Document ID
          </label>
          <input
            type="text"
            value={documentId}
            onChange={(e) => handleDocumentIdChange(e.target.value)}
            placeholder="e.g., doc-123 or {{ $json._id }}"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Unique document identifier (supports expressions)
          </p>
        </div>
      )}

      {needsDocument && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type
            </label>
            <input
              type="text"
              value={documentType}
              onChange={(e) => handleDocumentTypeChange(e.target.value)}
              placeholder="e.g., post, product, author"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Document type from your Sanity schema
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document (JSON)
            </label>
            <textarea
              value={document}
              onChange={(e) => handleDocumentChange(e.target.value)}
              placeholder='{\n  "title": "My Blog Post",\n  "slug": {"current": "my-blog-post"},\n  "body": "Content..."\n}'
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Document data matching your schema. _type will be added automatically.
            </p>
          </div>
        </>
      )}

      {needsPatches && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Patches (JSON Array)
          </label>
          <textarea
            value={patches}
            onChange={(e) => handlePatchesChange(e.target.value)}
            placeholder='[\n  {"set": {"title": "New Title"}},\n  {"unset": ["oldField"]}\n]'
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Array of patch operations (set, unset, inc, dec, insert, etc.)
          </p>
        </div>
      )}

      {needsQuery && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GROQ Query
            </label>
            <textarea
              value={groqQuery}
              onChange={(e) => handleGroqQueryChange(e.target.value)}
              placeholder='*[_type == "post" && publishedAt < now()] | order(publishedAt desc)'
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              GROQ query language for flexible data retrieval
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="useCdn"
              checked={useCdn}
              onChange={(e) => handleUseCdnChange(e.target.checked)}
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            />
            <label htmlFor="useCdn" className="ml-2 block text-sm text-gray-700">
              Use CDN (faster reads, may have slight delay)
            </label>
          </div>
        </>
      )}

      <div className="bg-red-50 border border-red-200 rounded-md p-3">
        <p className="text-sm font-medium text-red-900 mb-2">💡 Quick Examples:</p>
        <div className="text-xs text-red-800 space-y-2">
          {operation === 'create' && (
            <div>
              <p className="font-medium">Blog Post Document:</p>
              <pre className="bg-white p-2 rounded mt-1 overflow-x-auto">
{`{
  "title": "Getting Started with Sanity",
  "slug": {
    "current": "getting-started"
  },
  "publishedAt": "2024-01-15T10:00:00Z",
  "body": [
    {
      "_type": "block",
      "children": [
        {"_type": "span", "text": "Your content..."}
      ]
    }
  ],
  "author": {
    "_type": "reference",
    "_ref": "author-id-here"
  }
}`}
              </pre>
            </div>
          )}
          {operation === 'patch' && (
            <div>
              <p className="font-medium">Patch Operations:</p>
              <pre className="bg-white p-2 rounded mt-1 overflow-x-auto">
{`[
  {"set": {"title": "Updated Title"}},
  {"inc": {"views": 1}},
  {"unset": ["draft"]},
  {"setIfMissing": {"tags": []}}
]`}
              </pre>
            </div>
          )}
          {operation === 'query' && (
            <div>
              <p className="font-medium">GROQ Query Examples:</p>
              <p className="mt-1">• <code>*[_type == "post"]</code> - All posts</p>
              <p>• <code>*[_type == "post" && slug.current == $slug]</code> - By slug</p>
              <p>• <code>*[_type == "post"] | order(publishedAt desc) [0...10]</code> - Latest 10</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <p className="text-sm font-medium text-yellow-900 mb-1">⚠️ Important Notes:</p>
        <div className="text-xs text-yellow-700 space-y-1">
          <p>• References use _type: "reference" and _ref: "document-id"</p>
          <p>• Portable Text requires specific block structure</p>
          <p>• CDN has ~30s cache, use API directly for real-time data</p>
          <p>• Write operations require authentication token with write access</p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-sm text-gray-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-gray-600">
          Requires Sanity API token with appropriate permissions. Get it from{' '}
          <a
            href="https://www.sanity.io/manage"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-600 hover:underline"
          >
            Project Settings → API → Tokens
          </a>
        </p>
      </div>

      <div className="text-xs text-gray-500">
        📚 <a
          href="https://www.sanity.io/docs/http-api"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Sanity HTTP API
        </a>
        {' • '}
        <a
          href="https://www.sanity.io/docs/groq"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          GROQ Reference
        </a>
        {' • '}
        <a
          href="https://www.sanity.io/docs/js-client"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          JS Client Docs
        </a>
      </div>
    </div>
  );
};
