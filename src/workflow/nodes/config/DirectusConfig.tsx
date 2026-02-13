/**
 * Directus Node Configuration
 * Open-source headless CMS and data platform
 */

import React, { useState } from 'react';

interface DirectusConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

type DirectusOperation =
  | 'createItem' | 'readItem' | 'readItems' | 'updateItem' | 'deleteItem'
  | 'createItems' | 'updateItems' | 'deleteItems'
  | 'getCollections' | 'getFields';

export const DirectusConfig: React.FC<DirectusConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<DirectusOperation>(
    (config.operation as DirectusOperation) || 'createItem'
  );
  const [directusUrl, setDirectusUrl] = useState(config.directusUrl as string || '');
  const [collection, setCollection] = useState(config.collection as string || '');
  const [itemId, setItemId] = useState(config.itemId as string || '');
  const [data, setData] = useState(config.data as string || '{}');
  const [query, setQuery] = useState(config.query as string || '');
  const [filter, setFilter] = useState(config.filter as string || '{}');
  const [fields, setFields] = useState(config.fields as string || '*');
  const [limit, setLimit] = useState(config.limit as number || 100);

  const handleOperationChange = (newOperation: DirectusOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleDirectusUrlChange = (value: string) => {
    setDirectusUrl(value);
    onChange({ ...config, directusUrl: value });
  };

  const handleCollectionChange = (value: string) => {
    setCollection(value);
    onChange({ ...config, collection: value });
  };

  const handleItemIdChange = (value: string) => {
    setItemId(value);
    onChange({ ...config, itemId: value });
  };

  const handleDataChange = (value: string) => {
    setData(value);
    onChange({ ...config, data: value });
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    onChange({ ...config, query: value });
  };

  const handleFilterChange = (value: string) => {
    setFilter(value);
    onChange({ ...config, filter: value });
  };

  const handleFieldsChange = (value: string) => {
    setFields(value);
    onChange({ ...config, fields: value });
  };

  const handleLimitChange = (value: number) => {
    setLimit(value);
    onChange({ ...config, limit: value });
  };

  const needsCollection = !['getCollections', 'getFields'].includes(operation);
  const needsItemId = ['readItem', 'updateItem', 'deleteItem'].includes(operation);
  const needsData = ['createItem', 'createItems', 'updateItem', 'updateItems'].includes(operation);
  const canUseFilter = ['readItems', 'updateItems', 'deleteItems'].includes(operation);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as DirectusOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
        >
          <optgroup label="Single Items">
            <option value="createItem">Create Item</option>
            <option value="readItem">Read Item</option>
            <option value="updateItem">Update Item</option>
            <option value="deleteItem">Delete Item</option>
          </optgroup>
          <optgroup label="Multiple Items">
            <option value="createItems">Create Multiple Items</option>
            <option value="readItems">Read Items</option>
            <option value="updateItems">Update Multiple Items</option>
            <option value="deleteItems">Delete Multiple Items</option>
          </optgroup>
          <optgroup label="Metadata">
            <option value="getCollections">Get Collections</option>
            <option value="getFields">Get Fields</option>
          </optgroup>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Directus URL
        </label>
        <input
          type="text"
          value={directusUrl}
          onChange={(e) => handleDirectusUrlChange(e.target.value)}
          placeholder="https://your-project.directus.app"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Your Directus instance URL (self-hosted or cloud)
        </p>
      </div>

      {needsCollection && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Collection
          </label>
          <input
            type="text"
            value={collection}
            onChange={(e) => handleCollectionChange(e.target.value)}
            placeholder="e.g., articles, products, users"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Collection name from your Directus data model
          </p>
        </div>
      )}

      {needsItemId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item ID
          </label>
          <input
            type="text"
            value={itemId}
            onChange={(e) => handleItemIdChange(e.target.value)}
            placeholder="e.g., 1, abc-123, or {{ $json.id }}"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Item primary key (supports expressions)
          </p>
        </div>
      )}

      {needsData && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data (JSON)
          </label>
          <textarea
            value={data}
            onChange={(e) => handleDataChange(e.target.value)}
            placeholder={operation.includes('Items') ? '[\n  {"title": "Item 1"},\n  {"title": "Item 2"}\n]' : '{\n  "title": "My Article",\n  "status": "published"\n}'}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            {operation.includes('Items') ? 'Array of items to create/update' : 'Item data matching your collection schema'}
          </p>
        </div>
      )}

      {canUseFilter && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter (JSON)
          </label>
          <textarea
            value={filter}
            onChange={(e) => handleFilterChange(e.target.value)}
            placeholder='{\n  "status": {"_eq": "published"},\n  "date": {"_gte": "$NOW"}\n}'
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Directus filter rules using operators (_eq, _neq, _in, _gte, etc.)
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fields
        </label>
        <input
          type="text"
          value={fields}
          onChange={(e) => handleFieldsChange(e.target.value)}
          placeholder="*, id, title, author.name"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Comma-separated field names (* for all fields, use dot notation for relations)
        </p>
      </div>

      {operation === 'readItems' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Limit
          </label>
          <input
            type="number"
            value={limit}
            onChange={(e) => handleLimitChange(parseInt(e.target.value) || 100)}
            min="1"
            max="1000"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Maximum number of items to return (-1 for all)
          </p>
        </div>
      )}

      <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3">
        <p className="text-sm font-medium text-indigo-900 mb-2">💡 Quick Examples:</p>
        <div className="text-xs text-indigo-800 space-y-2">
          {operation === 'createItem' && (
            <div>
              <p className="font-medium">Article Example:</p>
              <pre className="bg-white p-2 rounded mt-1 overflow-x-auto">
{`{
  "title": "Getting Started with Directus",
  "slug": "getting-started",
  "body": "Your content here...",
  "status": "published",
  "author": 5,
  "tags": ["tutorial", "directus"]
}`}
              </pre>
            </div>
          )}
          {operation === 'readItems' && (
            <div>
              <p className="font-medium">Filter Examples:</p>
              <pre className="bg-white p-2 rounded mt-1 overflow-x-auto">
{`// Published articles
{"status": {"_eq": "published"}}

// Recent articles
{"date": {"_gte": "$NOW(-7 days)"}}

// Multiple conditions
{
  "_and": [
    {"status": {"_eq": "published"}},
    {"views": {"_gte": 100}}
  ]
}`}
              </pre>
            </div>
          )}
          {operation === 'updateItems' && (
            <p>• Use filters to update multiple items matching criteria</p>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <p className="text-sm font-medium text-yellow-900 mb-1">⚠️ Important Notes:</p>
        <div className="text-xs text-yellow-700 space-y-1">
          <p>• Relations use IDs or UUIDs depending on your schema</p>
          <p>• Status field controls draft/published/archived states</p>
          <p>• Use deep query parameters for nested relations (dot notation)</p>
          <p>• Directus supports dynamic variables like $NOW in filters</p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-sm text-gray-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-gray-600">
          Requires Directus Access Token. Get it from{' '}
          <strong>Settings → Access Tokens</strong> in your Directus instance.
        </p>
        <p className="text-xs text-gray-600 mt-2">
          <strong>Permissions:</strong> Ensure the token has appropriate permissions for the operations you're performing.
        </p>
      </div>

      <div className="text-xs text-gray-500">
        📚 <a
          href="https://docs.directus.io/reference/introduction.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Directus API Reference
        </a>
        {' • '}
        <a
          href="https://docs.directus.io/reference/filter-rules.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Filter Rules
        </a>
        {' • '}
        <a
          href="https://docs.directus.io/reference/query.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Query Parameters
        </a>
      </div>
    </div>
  );
};
