/**
 * Prismic Node Configuration
 * Headless website builder with visual editing
 */

import React, { useState } from 'react';

interface PrismicConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

type PrismicOperation =
  | 'getByID' | 'getByUID' | 'getSingle' | 'getAllByType'
  | 'query' | 'getFirst' | 'getByIDs' | 'getByUIDs';

export const PrismicConfig: React.FC<PrismicConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<PrismicOperation>(
    (config.operation as PrismicOperation) || 'getAllByType'
  );
  const [repositoryName, setRepositoryName] = useState(config.repositoryName as string || '');
  const [documentId, setDocumentId] = useState(config.documentId as string || '');
  const [documentType, setDocumentType] = useState(config.documentType as string || '');
  const [uid, setUid] = useState(config.uid as string || '');
  const [predicates, setPredicates] = useState(config.predicates as string || '');
  const [lang, setLang] = useState(config.lang as string || '*');
  const [pageSize, setPageSize] = useState(config.pageSize as number || 20);
  const [fetchLinks, setFetchLinks] = useState(config.fetchLinks as string || '');

  const handleOperationChange = (newOperation: PrismicOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleRepositoryNameChange = (value: string) => {
    setRepositoryName(value);
    onChange({ ...config, repositoryName: value });
  };

  const handleDocumentIdChange = (value: string) => {
    setDocumentId(value);
    onChange({ ...config, documentId: value });
  };

  const handleDocumentTypeChange = (value: string) => {
    setDocumentType(value);
    onChange({ ...config, documentType: value });
  };

  const handleUidChange = (value: string) => {
    setUid(value);
    onChange({ ...config, uid: value });
  };

  const handlePredicatesChange = (value: string) => {
    setPredicates(value);
    onChange({ ...config, predicates: value });
  };

  const handleLangChange = (value: string) => {
    setLang(value);
    onChange({ ...config, lang: value });
  };

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    onChange({ ...config, pageSize: value });
  };

  const handleFetchLinksChange = (value: string) => {
    setFetchLinks(value);
    onChange({ ...config, fetchLinks: value });
  };

  const needsDocumentId = operation === 'getByID';
  const needsUid = ['getByUID', 'getByUIDs'].includes(operation);
  const needsDocumentType = ['getByUID', 'getAllByType', 'getSingle', 'getByUIDs'].includes(operation);
  const needsPredicates = operation === 'query';

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as PrismicOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
        >
          <option value="getByID">Get By ID</option>
          <option value="getByUID">Get By UID</option>
          <option value="getByIDs">Get By IDs (multiple)</option>
          <option value="getByUIDs">Get By UIDs (multiple)</option>
          <option value="getSingle">Get Single Type</option>
          <option value="getAllByType">Get All By Type</option>
          <option value="query">Custom Query (Predicates)</option>
          <option value="getFirst">Get First Match</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Repository Name
        </label>
        <input
          type="text"
          value={repositoryName}
          onChange={(e) => handleRepositoryNameChange(e.target.value)}
          placeholder="e.g., your-repo-name"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Your Prismic repository name (from URL: your-repo-name.prismic.io)
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
            placeholder="e.g., YQ7UYhEAAC8A0LqP or {{ $json.id }}"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Prismic document ID (supports expressions)
          </p>
        </div>
      )}

      {needsDocumentType && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Document Type
          </label>
          <input
            type="text"
            value={documentType}
            onChange={(e) => handleDocumentTypeChange(e.target.value)}
            placeholder="e.g., blog_post, product, page"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Custom type API ID from your Prismic repository
          </p>
        </div>
      )}

      {needsUid && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            UID {operation === 'getByUIDs' && '(comma-separated)'}
          </label>
          <input
            type="text"
            value={uid}
            onChange={(e) => handleUidChange(e.target.value)}
            placeholder={operation === 'getByUIDs' ? "home, about, contact" : "e.g., getting-started or {{ $json.uid }}"}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            {operation === 'getByUIDs' ? 'Multiple UIDs separated by commas' : 'Unique identifier (supports expressions)'}
          </p>
        </div>
      )}

      {needsPredicates && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Predicates (JSON Array)
          </label>
          <textarea
            value={predicates}
            onChange={(e) => handlePredicatesChange(e.target.value)}
            placeholder='[\n  ["at", "document.type", "blog_post"],\n  ["date.after", "my.blog_post.date", "2024-01-01"]\n]'
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Prismic predicate-based query language (JSON array format)
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Language
        </label>
        <input
          type="text"
          value={lang}
          onChange={(e) => handleLangChange(e.target.value)}
          placeholder="* (all), en-us, fr-fr, de-de..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Language code (* for default locale)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Page Size
        </label>
        <input
          type="number"
          value={pageSize}
          onChange={(e) => handlePageSizeChange(parseInt(e.target.value) || 20)}
          min="1"
          max="100"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Number of results per page (max: 100)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fetch Links (Optional)
        </label>
        <input
          type="text"
          value={fetchLinks}
          onChange={(e) => handleFetchLinksChange(e.target.value)}
          placeholder="author.name, category.title"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Comma-separated fields to fetch from linked documents
        </p>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
        <p className="text-sm font-medium text-purple-900 mb-2">💡 Quick Examples:</p>
        <div className="text-xs text-purple-800 space-y-2">
          {operation === 'query' && (
            <div>
              <p className="font-medium">Predicate Examples:</p>
              <pre className="bg-white p-2 rounded mt-1 overflow-x-auto">
{`// Get all blog posts
[["at", "document.type", "blog_post"]]

// Posts after date
[
  ["at", "document.type", "blog_post"],
  ["date.after", "my.blog_post.date", "2024-01-01"]
]

// Posts with tag
[
  ["at", "document.type", "blog_post"],
  ["at", "document.tags", ["Featured"]]
]`}
              </pre>
            </div>
          )}
          {operation === 'getAllByType' && (
            <div>
              <p>• Returns all documents of a specific type</p>
              <p>• Use page size to control result batching</p>
              <p>• Add fetch links to include referenced document data</p>
            </div>
          )}
          {operation === 'getByUID' && (
            <div>
              <p>• UIDs are unique slugs for documents</p>
              <p>• Perfect for routing (e.g., /blog/getting-started)</p>
              <p>• Combine with document type for specific content</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <p className="text-sm font-medium text-yellow-900 mb-1">⚠️ Important Notes:</p>
        <div className="text-xs text-yellow-700 space-y-1">
          <p>• Single types don't have UIDs (use getSingle operation)</p>
          <p>• Fetch links improve performance by reducing API calls</p>
          <p>• Language codes must match your repository settings</p>
          <p>• Read-only access - use Content API for fetching only</p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-sm text-gray-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-gray-600">
          <strong>Public repositories:</strong> No token required<br />
          <strong>Private repositories:</strong> Requires access token from{' '}
          <a
            href="https://prismic.io/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 hover:underline"
          >
            Settings → API & Security
          </a>
        </p>
      </div>

      <div className="text-xs text-gray-500">
        📚 <a
          href="https://prismic.io/docs/rest-api"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Prismic REST API
        </a>
        {' • '}
        <a
          href="https://prismic.io/docs/query-api"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Query Predicates
        </a>
        {' • '}
        <a
          href="https://prismic.io/docs/fetch-linked-document-fields"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Fetch Links
        </a>
      </div>
    </div>
  );
};
