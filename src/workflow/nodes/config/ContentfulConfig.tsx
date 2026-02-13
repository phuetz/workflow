/**
 * Contentful Node Configuration
 * Headless CMS for content infrastructure
 */

import React, { useState } from 'react';

interface ContentfulConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

type ContentfulOperation =
  | 'getEntry' | 'getEntries' | 'createEntry' | 'updateEntry' | 'deleteEntry' | 'publishEntry' | 'unpublishEntry'
  | 'getAsset' | 'getAssets' | 'createAsset' | 'updateAsset' | 'deleteAsset'
  | 'getContentType' | 'getContentTypes';

export const ContentfulConfig: React.FC<ContentfulConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<ContentfulOperation>(
    (config.operation as ContentfulOperation) || 'createEntry'
  );
  const [spaceId, setSpaceId] = useState(config.spaceId as string || '');
  const [environment, setEnvironment] = useState(config.environment as string || 'master');
  const [entryId, setEntryId] = useState(config.entryId as string || '');
  const [contentType, setContentType] = useState(config.contentType as string || '');
  const [fields, setFields] = useState(config.fields as string || '{}');
  const [query, setQuery] = useState(config.query as string || '');
  const [locale, setLocale] = useState(config.locale as string || 'en-US');

  const handleOperationChange = (newOperation: ContentfulOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleSpaceIdChange = (value: string) => {
    setSpaceId(value);
    onChange({ ...config, spaceId: value });
  };

  const handleEnvironmentChange = (value: string) => {
    setEnvironment(value);
    onChange({ ...config, environment: value });
  };

  const handleEntryIdChange = (value: string) => {
    setEntryId(value);
    onChange({ ...config, entryId: value });
  };

  const handleContentTypeChange = (value: string) => {
    setContentType(value);
    onChange({ ...config, contentType: value });
  };

  const handleFieldsChange = (value: string) => {
    setFields(value);
    onChange({ ...config, fields: value });
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    onChange({ ...config, query: value });
  };

  const handleLocaleChange = (value: string) => {
    setLocale(value);
    onChange({ ...config, locale: value });
  };

  const needsEntryId = ['getEntry', 'updateEntry', 'deleteEntry', 'publishEntry', 'unpublishEntry'].includes(operation);
  const needsContentType = ['createEntry'].includes(operation);
  const needsFields = ['createEntry', 'updateEntry', 'createAsset', 'updateAsset'].includes(operation);
  const canUseQuery = ['getEntries', 'getAssets'].includes(operation);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as ContentfulOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
        >
          <optgroup label="Entries">
            <option value="getEntry">Get Entry</option>
            <option value="getEntries">Get Entries</option>
            <option value="createEntry">Create Entry</option>
            <option value="updateEntry">Update Entry</option>
            <option value="deleteEntry">Delete Entry</option>
            <option value="publishEntry">Publish Entry</option>
            <option value="unpublishEntry">Unpublish Entry</option>
          </optgroup>
          <optgroup label="Assets">
            <option value="getAsset">Get Asset</option>
            <option value="getAssets">Get Assets</option>
            <option value="createAsset">Create Asset</option>
            <option value="updateAsset">Update Asset</option>
            <option value="deleteAsset">Delete Asset</option>
          </optgroup>
          <optgroup label="Content Types">
            <option value="getContentType">Get Content Type</option>
            <option value="getContentTypes">Get Content Types</option>
          </optgroup>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Space ID
        </label>
        <input
          type="text"
          value={spaceId}
          onChange={(e) => handleSpaceIdChange(e.target.value)}
          placeholder="e.g., abc123def456"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Your Contentful space identifier
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Environment
        </label>
        <input
          type="text"
          value={environment}
          onChange={(e) => handleEnvironmentChange(e.target.value)}
          placeholder="master, staging, development..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Environment name (default: master)
        </p>
      </div>

      {needsEntryId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {operation.includes('Asset') ? 'Asset ID' : 'Entry ID'}
          </label>
          <input
            type="text"
            value={entryId}
            onChange={(e) => handleEntryIdChange(e.target.value)}
            placeholder="e.g., 6KntaYXaHSyIw8M6eo26OK or {{ $json.sys.id }}"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Contentful entry/asset ID (supports expressions)
          </p>
        </div>
      )}

      {needsContentType && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Content Type ID
          </label>
          <input
            type="text"
            value={contentType}
            onChange={(e) => handleContentTypeChange(e.target.value)}
            placeholder="e.g., blogPost, product, author"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Content type identifier from your space
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Locale
        </label>
        <input
          type="text"
          value={locale}
          onChange={(e) => handleLocaleChange(e.target.value)}
          placeholder="en-US, de-DE, fr-FR..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Content locale (default: en-US)
        </p>
      </div>

      {needsFields && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fields (JSON)
          </label>
          <textarea
            value={fields}
            onChange={(e) => handleFieldsChange(e.target.value)}
            placeholder='{\n  "title": {"en-US": "My Blog Post"},\n  "body": {"en-US": "Content here..."}\n}'
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Fields object with locale-specific values
          </p>
        </div>
      )}

      {canUseQuery && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Query Parameters (Optional)
          </label>
          <textarea
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder='content_type=blogPost&fields.category=Technology&order=-sys.createdAt'
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            URL query parameters for filtering and sorting
          </p>
        </div>
      )}

      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
        <p className="text-sm font-medium text-orange-900 mb-2">💡 Quick Examples:</p>
        <div className="text-xs text-orange-800 space-y-2">
          {operation === 'createEntry' && (
            <div>
              <p className="font-medium">Blog Post Entry:</p>
              <pre className="bg-white p-2 rounded mt-1 overflow-x-auto">
{`{
  "title": {
    "en-US": "Getting Started with Contentful"
  },
  "slug": {
    "en-US": "getting-started"
  },
  "body": {
    "en-US": "Your content here..."
  },
  "author": {
    "en-US": {
      "sys": {
        "type": "Link",
        "linkType": "Entry",
        "id": "author-entry-id"
      }
    }
  }
}`}
              </pre>
            </div>
          )}
          {operation === 'getEntries' && (
            <div>
              <p className="font-medium">Query Examples:</p>
              <p className="mt-1">• <code>content_type=blogPost</code></p>
              <p>• <code>fields.category=Technology&limit=10</code></p>
              <p>• <code>order=-sys.createdAt&include=2</code></p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <p className="text-sm font-medium text-yellow-900 mb-1">⚠️ Important Notes:</p>
        <div className="text-xs text-yellow-700 space-y-1">
          <p>• All field values must be wrapped in locale objects</p>
          <p>• Use Management API token for write operations</p>
          <p>• Entries must be published to appear in Delivery API</p>
          <p>• Referenced entries use the Link structure with sys.id</p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-sm text-gray-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-gray-600">
          <strong>Delivery API:</strong> Read-only access to published content<br />
          <strong>Preview API:</strong> Access to draft and published content<br />
          <strong>Management API:</strong> Full CRUD access (create, update, delete)
        </p>
        <p className="text-xs text-gray-600 mt-2">
          Get tokens from{' '}
          <a
            href="https://app.contentful.com/spaces/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-600 hover:underline"
          >
            Settings → API keys
          </a>
        </p>
      </div>

      <div className="text-xs text-gray-500">
        📚 <a
          href="https://www.contentful.com/developers/docs/references/content-management-api/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Management API Docs
        </a>
        {' • '}
        <a
          href="https://www.contentful.com/developers/docs/references/content-delivery-api/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Delivery API Docs
        </a>
      </div>
    </div>
  );
};
