/**
 * Notion Node Configuration Component
 * UI for configuring Notion operations
 */

import React, { useState } from 'react';
import type { NotionOperation } from '../../../integrations/notion/notion.types';
import type { WorkflowNode } from '../../../types/workflow';

interface NotionConfigProps {
  node: WorkflowNode;
}

export function NotionConfig({ node }: NotionConfigProps) {
  const [operation, setOperation] = useState<NotionOperation>(
    (node.data?.config?.operation as NotionOperation) || 'createPage'
  );
  const [databaseId, setDatabaseId] = useState((node.data?.config?.databaseId as string) || '');
  const [pageId, setPageId] = useState((node.data?.config?.pageId as string) || '');
  const [title, setTitle] = useState((node.data?.config?.title as string) || '');
  const [properties, setProperties] = useState((node.data?.config?.properties as string) || '{}');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => setOperation(e.target.value as NotionOperation)}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
        >
          <optgroup label="Pages">
            <option value="createPage">Create Page</option>
            <option value="updatePage">Update Page</option>
            <option value="getPage">Get Page</option>
            <option value="archivePage">Archive Page</option>
          </optgroup>
          <optgroup label="Databases">
            <option value="queryDatabase">Query Database</option>
            <option value="createDatabase">Create Database</option>
            <option value="updateDatabase">Update Database</option>
            <option value="getDatabase">Get Database</option>
          </optgroup>
          <optgroup label="Blocks">
            <option value="appendBlockChildren">Append Block Children</option>
            <option value="getBlock">Get Block</option>
          </optgroup>
          <optgroup label="Other">
            <option value="search">Search</option>
          </optgroup>
        </select>
      </div>

      {/* Database ID for database operations */}
      {(['queryDatabase', 'createDatabase', 'updateDatabase', 'getDatabase'].includes(operation)) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Database ID
          </label>
          <input
            type="text"
            value={databaseId}
            onChange={(e) => setDatabaseId(e.target.value)}
            placeholder="e.g., d9824bdc-8445-4327-be8b-5b47500af6ce"
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-500">
            The database ID from the Notion URL
          </p>
        </div>
      )}

      {/* Page ID for page operations */}
      {(['updatePage', 'getPage', 'archivePage', 'appendBlockChildren'].includes(operation)) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Page ID
          </label>
          <input
            type="text"
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
            placeholder="e.g., 4b4bb21d-f68b-4113-b342-830687cbcd01"
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-500">
            The page ID from the Notion URL
          </p>
        </div>
      )}

      {/* Title for create operations */}
      {(['createPage', 'createDatabase'].includes(operation)) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Page or database title"
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
      )}

      {/* Properties JSON for advanced operations */}
      {!['search', 'getPage', 'getDatabase', 'getBlock'].includes(operation) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Properties (JSON)
          </label>
          <textarea
            value={properties}
            onChange={(e) => setProperties(e.target.value)}
            placeholder={operation === 'queryDatabase' ? '{"property": "Status", "value": "Done"}' : '{"Name": {"title": [{"text": {"content": "Page Title"}}]}}'}
            rows={6}
            className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Notion properties in JSON format
          </p>
        </div>
      )}

      {/* Quick Examples */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm font-medium text-blue-900 mb-2">💡 Quick Examples:</p>
        <div className="text-xs text-blue-800 space-y-1">
          {operation === 'createPage' && (
            <>
              <p><strong>Create page in database:</strong></p>
              <code className="block bg-white p-2 rounded mt-1">
                {`{
  "Name": {"title": [{"text": {"content": "My Page"}}]},
  "Status": {"select": {"name": "In Progress"}},
  "Due Date": {"date": {"start": "2024-12-31"}}
}`}
              </code>
            </>
          )}
          {operation === 'queryDatabase' && (
            <>
              <p><strong>Query with filter:</strong></p>
              <code className="block bg-white p-2 rounded mt-1">
                {`{
  "filter": {
    "property": "Status",
    "select": {"equals": "Done"}
  },
  "sorts": [{"property": "Created", "direction": "descending"}]
}`}
              </code>
            </>
          )}
          {operation === 'updatePage' && (
            <>
              <p><strong>Update properties:</strong></p>
              <code className="block bg-white p-2 rounded mt-1">
                {`{
  "Status": {"select": {"name": "Complete"}},
  "Notes": {"rich_text": [{"text": {"content": "Updated content"}}]}
}`}
              </code>
            </>
          )}
          {operation === 'search' && (
            <p>Search for pages and databases across your workspace. Leave properties empty to search all.</p>
          )}
        </div>
      </div>

      {/* Authentication Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600">
          <strong>Authentication:</strong> Requires a Notion integration token.
          Get your token from the{' '}
          <a
            href="https://www.notion.so/my-integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Notion Integrations page
          </a>.
        </p>
      </div>

      {/* API Documentation Link */}
      <div className="text-xs text-gray-500">
        📚 <a
          href="https://developers.notion.com/reference/intro"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Notion API Documentation
        </a>
      </div>
    </div>
  );
}
