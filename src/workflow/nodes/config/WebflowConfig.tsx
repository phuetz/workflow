/**
 * Webflow Node Configuration
 * Visual web design and CMS platform
 */

import React, { useState } from 'react';

interface WebflowConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

type WebflowOperation =
  | 'getSites' | 'getSite' | 'publishSite'
  | 'getCollections' | 'getCollection' | 'createCollectionItem'
  | 'updateCollectionItem' | 'getCollectionItem' | 'deleteCollectionItem' | 'listCollectionItems'
  | 'getUser';

export const WebflowConfig: React.FC<WebflowConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<WebflowOperation>(
    (config.operation as WebflowOperation) || 'createCollectionItem'
  );
  const [siteId, setSiteId] = useState(config.siteId as string || '');
  const [collectionId, setCollectionId] = useState(config.collectionId as string || '');
  const [itemId, setItemId] = useState(config.itemId as string || '');
  const [fields, setFields] = useState(config.fields as string || '{}');
  const [live, setLive] = useState(config.live as boolean || false);

  const handleOperationChange = (newOperation: WebflowOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleSiteIdChange = (value: string) => {
    setSiteId(value);
    onChange({ ...config, siteId: value });
  };

  const handleCollectionIdChange = (value: string) => {
    setCollectionId(value);
    onChange({ ...config, collectionId: value });
  };

  const handleItemIdChange = (value: string) => {
    setItemId(value);
    onChange({ ...config, itemId: value });
  };

  const handleFieldsChange = (value: string) => {
    setFields(value);
    onChange({ ...config, fields: value });
  };

  const handleLiveChange = (value: boolean) => {
    setLive(value);
    onChange({ ...config, live: value });
  };

  const needsSiteId = ['getSite', 'publishSite', 'getCollections'].includes(operation);
  const needsCollectionId = ['getCollection', 'createCollectionItem', 'listCollectionItems'].includes(operation);
  const needsItemId = ['updateCollectionItem', 'getCollectionItem', 'deleteCollectionItem'].includes(operation);
  const needsFields = ['createCollectionItem', 'updateCollectionItem'].includes(operation);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as WebflowOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <optgroup label="Sites">
            <option value="getSites">Get Sites</option>
            <option value="getSite">Get Site</option>
            <option value="publishSite">Publish Site</option>
          </optgroup>
          <optgroup label="Collections">
            <option value="getCollections">Get Collections</option>
            <option value="getCollection">Get Collection</option>
          </optgroup>
          <optgroup label="Collection Items">
            <option value="createCollectionItem">Create Collection Item</option>
            <option value="updateCollectionItem">Update Collection Item</option>
            <option value="getCollectionItem">Get Collection Item</option>
            <option value="deleteCollectionItem">Delete Collection Item</option>
            <option value="listCollectionItems">List Collection Items</option>
          </optgroup>
          <optgroup label="User">
            <option value="getUser">Get User Info</option>
          </optgroup>
        </select>
      </div>

      {needsSiteId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Site ID
          </label>
          <input
            type="text"
            value={siteId}
            onChange={(e) => handleSiteIdChange(e.target.value)}
            placeholder="e.g., 5f1a3c4d123abc456def7890 or {{ $json.siteId }}"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Webflow site identifier (supports expressions)
          </p>
        </div>
      )}

      {needsCollectionId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Collection ID
          </label>
          <input
            type="text"
            value={collectionId}
            onChange={(e) => handleCollectionIdChange(e.target.value)}
            placeholder="e.g., 5f1a3c4d123abc456def7891 or {{ $json.collectionId }}"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            CMS collection identifier (supports expressions)
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
            placeholder="e.g., 5f1a3c4d123abc456def7892 or {{ $json.itemId }}"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Collection item identifier (supports expressions)
          </p>
        </div>
      )}

      {needsFields && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fields (JSON)
          </label>
          <textarea
            value={fields}
            onChange={(e) => handleFieldsChange(e.target.value)}
            placeholder='{\n  "name": "My Blog Post",\n  "slug": "my-blog-post",\n  "_archived": false,\n  "_draft": false\n}'
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Field values matching your collection schema. Use field slugs as keys.
          </p>
        </div>
      )}

      {operation === 'publishSite' && (
        <div className="flex items-center">
          <input
            type="checkbox"
            id="live"
            checked={live}
            onChange={(e) => handleLiveChange(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="live" className="ml-2 block text-sm text-gray-700">
            Publish to live domain (unchecked = staging only)
          </label>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm font-medium text-blue-900 mb-2">💡 Quick Examples:</p>
        <div className="text-xs text-blue-800 space-y-2">
          {operation === 'createCollectionItem' && (
            <div>
              <p className="font-medium">Blog Post Example:</p>
              <pre className="bg-white p-2 rounded mt-1 overflow-x-auto">
{`{
  "name": "Getting Started with Webflow",
  "slug": "getting-started",
  "post-body": "<p>Your content here...</p>",
  "author": "5f1a3c4d123abc456def7890",
  "category": "Tutorial",
  "_archived": false,
  "_draft": false
}`}
              </pre>
            </div>
          )}
          {operation === 'updateCollectionItem' && (
            <div>
              <p className="font-medium">Update Item:</p>
              <pre className="bg-white p-2 rounded mt-1 overflow-x-auto">
{`{
  "name": "Updated Title",
  "_archived": false,
  "_draft": false
}`}
              </pre>
            </div>
          )}
          {operation === 'publishSite' && (
            <p>• Publishing deploys your changes to the staging or live site</p>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <p className="text-sm font-medium text-yellow-900 mb-1">⚠️ Important Notes:</p>
        <div className="text-xs text-yellow-700 space-y-1">
          <p>• Field slugs must match your collection schema exactly</p>
          <p>• Use "_archived" and "_draft" to control item visibility</p>
          <p>• Reference fields use the ID of the referenced item</p>
          <p>• Publishing can take a few seconds to complete</p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-sm text-gray-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-gray-600">
          Requires Webflow API Token. Get it from your{' '}
          <a
            href="https://webflow.com/dashboard/account/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Account Settings → Apps & Integrations
          </a>
        </p>
      </div>

      <div className="text-xs text-gray-500">
        📚 <a
          href="https://developers.webflow.com/reference/introduction"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Webflow API Documentation
        </a>
        {' • '}
        <a
          href="https://developers.webflow.com/reference/cms"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          CMS API Reference
        </a>
      </div>
    </div>
  );
};
